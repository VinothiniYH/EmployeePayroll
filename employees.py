
from flask import Blueprint, jsonify, request
from db import get_db_connection

employees_bp = Blueprint("employees", __name__)


# GET: Retrieve all employees
@employees_bp.route("/api/employees", methods=["GET"])
def get_employees():
    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT employee_id, name, department,
                   designation, basic_salary
            FROM employees
            ORDER BY employee_id
        """)

        employees = cursor.fetchall()

        # Convert Decimal salary values to JSON-friendly numbers
        for employee in employees:
            employee["basic_salary"] = float(employee["basic_salary"])

        return jsonify(employees), 200

    except Exception as error:
        print("Error retrieving employees:", error)
        return jsonify({"error": "Could not retrieve employees"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# GET: Retrieve one employee by ID
@employees_bp.route("/api/employees/<int:employee_id>", methods=["GET"])
def get_employee(employee_id):
    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT employee_id, name, department,
                   designation, basic_salary
            FROM employees
            WHERE employee_id = %s
        """, (employee_id,))

        employee = cursor.fetchone()

        if employee is None:
            return jsonify({"error": "Employee not found"}), 404

        employee["basic_salary"] = float(employee["basic_salary"])
        return jsonify(employee), 200

    except Exception as error:
        print("Error retrieving employee:", error)
        return jsonify({"error": "Could not retrieve employee"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# POST: Add a new employee
@employees_bp.route("/api/employees", methods=["POST"])
def add_employee():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Send employee details as JSON"}), 400

    required_fields = ["name", "department", "designation", "basic_salary"]

    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({"error": f"{field} is required"}), 400

        if str(data[field]).strip() == "":
            return jsonify({"error": f"{field} is required"}), 400

    try:
        salary = float(data["basic_salary"])
        if salary < 0 or salary == float("inf") or salary != salary:
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify({"error": "Enter a valid non-negative salary"}), 400

    name = str(data["name"]).strip()
    department = str(data["department"]).strip()
    designation = str(data["designation"]).strip()

    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO employees
                (name, department, designation, basic_salary)
            VALUES (%s, %s, %s, %s)
        """, (name, department, designation, salary))

        connection.commit()
        new_employee_id = cursor.lastrowid

        return jsonify({
            "message": "Employee added successfully",
            "employee": {
                "employee_id": new_employee_id,
                "name": name,
                "department": department,
                "designation": designation,
                "basic_salary": salary
            }
        }), 201

    except Exception as error:
        connection.rollback()
        print("Error adding employee:", error)
        return jsonify({"error": "Could not add employee"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# PUT: Update an existing employee
@employees_bp.route("/api/employees/<int:employee_id>", methods=["PUT"])
def update_employee(employee_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Send employee details as JSON"}), 400

    required_fields = ["name", "department", "designation", "basic_salary"]

    for field in required_fields:
        if field not in data or data[field] is None:
            return jsonify({"error": f"{field} is required"}), 400
        if str(data[field]).strip() == "":
            return jsonify({"error": f"{field} is required"}), 400

    try:
        salary = float(data["basic_salary"])
        if not (0 <= salary < float("inf")):
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify({"error": "Enter a valid non-negative salary"}), 400

    name = str(data["name"]).strip()
    department = str(data["department"]).strip()
    designation = str(data["designation"]).strip()

    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE employees
            SET name = %s,
                department = %s,
                designation = %s,
                basic_salary = %s
            WHERE employee_id = %s
        """, (name, department, designation, salary, employee_id))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT employee_id FROM employees WHERE employee_id = %s",
                (employee_id,)
            )
            if cursor.fetchone() is None:
                connection.rollback()
                return jsonify({"error": "Employee not found"}), 404

        connection.commit()

        return jsonify({
            "message": "Employee updated successfully",
            "employee": {
                "employee_id": employee_id,
                "name": name,
                "department": department,
                "designation": designation,
                "basic_salary": salary
            }
        }), 200

    except Exception as error:
        connection.rollback()
        print("Error updating employee:", error)
        return jsonify({"error": "Could not update employee"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# DELETE: Remove an employee by ID
@employees_bp.route("/api/employees/<int:employee_id>", methods=["DELETE"])
def delete_employee(employee_id):
    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM employees WHERE employee_id = %s",
            (employee_id,)
        )

        if cursor.rowcount == 0:
            connection.rollback()
            return jsonify({"error": "Employee not found"}), 404

        connection.commit()

        return jsonify({
            "message": "Employee deleted successfully",
            "employee_id": employee_id
        }), 200

    except Exception as error:
        connection.rollback()
        print("Error deleting employee:", error)
        return jsonify({"error": "Could not delete employee"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# PAYROLL: Calculate an employee's monthly salary
@employees_bp.route(
    "/api/employees/<int:employee_id>/payroll",
    methods=["GET"]
)
def calculate_payroll(employee_id):
    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        cursor.execute("""
            SELECT employee_id, name, basic_salary
            FROM employees
            WHERE employee_id = %s
        """, (employee_id,))

        employee = cursor.fetchone()

        if employee is None:
            return jsonify({"error": "Employee not found"}), 404

        emp_id, name, basic_salary = employee

        basic_salary = float(basic_salary)
        hra = round(basic_salary * 0.20, 2)
        other_allowance = 2000.00
        deductions = 3000.00

        gross_salary = round(
            basic_salary + hra + other_allowance, 2
        )

        net_salary = round(gross_salary - deductions, 2)

        if net_salary < 0:
            net_salary = 0.00

        return jsonify({
            "employee_id": emp_id,
            "name": name,
            "basic_salary": round(basic_salary, 2),
            "hra": hra,
            "other_allowance": other_allowance,
            "gross_salary": gross_salary,
            "deductions": deductions,
            "net_salary": net_salary
        }), 200

    except Exception as error:
        print("Payroll calculation error:", error)
        return jsonify({
            "error": "Could not calculate payroll"
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# PAYROLL: Save a monthly payroll record
@employees_bp.route(
    "/api/employees/<int:employee_id>/payroll",
    methods=["POST"]
)
def save_payroll(employee_id):
    from datetime import date

    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        # Get the employee's current basic salary
        cursor.execute("""
            SELECT employee_id, name, basic_salary
            FROM employees
            WHERE employee_id = %s
        """, (employee_id,))

        employee = cursor.fetchone()

        if employee is None:
            return jsonify({"error": "Employee not found"}), 404

        emp_id, name, basic_salary = employee
        basic_salary = float(basic_salary)

        # Example payroll rules
        hra = round(basic_salary * 0.20, 2)
        other_allowance = 2000.00
        deductions = 3000.00
        gross_salary = round(
            basic_salary + hra + other_allowance, 2
        )
        net_salary = round(gross_salary - deductions, 2)

        if net_salary < 0:
            net_salary = 0.00

        # Store one payroll record for the current month
        payroll_month = date.today().replace(day=1)

        cursor.execute("""
            INSERT INTO payroll (
                employee_id, payroll_month, basic_salary, hra,
                other_allowance, gross_salary, deductions, net_salary
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                basic_salary = VALUES(basic_salary),
                hra = VALUES(hra),
                other_allowance = VALUES(other_allowance),
                gross_salary = VALUES(gross_salary),
                deductions = VALUES(deductions),
                net_salary = VALUES(net_salary)
        """, (
            emp_id, payroll_month, basic_salary, hra,
            other_allowance, gross_salary, deductions, net_salary
        ))

        connection.commit()

        return jsonify({
            "message": "Payroll saved successfully",
            "employee_id": emp_id,
            "name": name,
            "payroll_month": payroll_month.isoformat(),
            "basic_salary": basic_salary,
            "hra": hra,
            "other_allowance": other_allowance,
            "gross_salary": gross_salary,
            "deductions": deductions,
            "net_salary": net_salary
        }), 200

    except Exception as error:
        connection.rollback()
        print("Error saving payroll:", error)
        return jsonify({"error": "Could not save payroll"}), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()


# PAYROLL: View an employee's saved payroll history
@employees_bp.route(
    "/api/employees/<int:employee_id>/payroll/history",
    methods=["GET"]
)
def payroll_history(employee_id):
    connection = get_db_connection()

    if connection is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = None

    try:
        cursor = connection.cursor()

        # Check that the employee exists
        cursor.execute(
            "SELECT employee_id, name FROM employees WHERE employee_id = %s",
            (employee_id,)
        )
        employee = cursor.fetchone()

        if employee is None:
            return jsonify({"error": "Employee not found"}), 404

        # Retrieve saved payroll records
        cursor.execute("""
            SELECT payroll_id, payroll_month, basic_salary, hra,
                   other_allowance, gross_salary, deductions, net_salary
            FROM payroll
            WHERE employee_id = %s
            ORDER BY payroll_month DESC
        """, (employee_id,))

        records = cursor.fetchall()

        history = []

        for record in records:
            history.append({
                "payroll_id": record[0],
                "payroll_month": record[1].isoformat(),
                "basic_salary": float(record[2]),
                "hra": float(record[3]),
                "other_allowance": float(record[4]),
                "gross_salary": float(record[5]),
                "deductions": float(record[6]),
                "net_salary": float(record[7])
            })

        return jsonify({
            "employee_id": employee[0],
            "name": employee[1],
            "payroll_history": history
        }), 200

    except Exception as error:
        print("Payroll history error:", error)
        return jsonify({
            "error": "Could not retrieve payroll history"
        }), 500

    finally:
        if cursor:
            cursor.close()
        connection.close()