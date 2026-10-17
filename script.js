
const API_URL = "http://127.0.0.1:5000/api/employees";

let employees = [];

// Format amounts in Indian Rupees
function money(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Show the selected section
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.add("hidden");
    });

    document.getElementById(sectionId).classList.remove("hidden");

    if (sectionId === "employees") {
        loadEmployees();
    }
}

// Load employee records from Flask/MySQL
async function loadEmployees() {
    const table = document.getElementById("employeeTable");

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load employees.");
        }

        employees = Array.isArray(data) ? data : [];
        renderEmployees();
        updateDashboard();

    } catch (error) {
        console.error(error);
        table.innerHTML =
            '<tr><td colspan="5">Unable to load employees. Check Flask and try again.</td></tr>';
    }
}

// Update dashboard totals
function updateDashboard() {
    document.getElementById("totalEmployees").textContent =
        employees.length;

    const total = employees.reduce((sum, employee) => {
        return sum + Number(employee.basic_salary || 0);
    }, 0);

    document.getElementById("totalPayroll").textContent = money(total);
}

// Display and search employees
function renderEmployees() {
    const table = document.getElementById("employeeTable");
    const searchText = document.getElementById("search").value
        .trim().toLowerCase();

    table.innerHTML = "";

    const filtered = employees.filter(employee =>
        String(employee.employee_id).toLowerCase().includes(searchText) ||
        String(employee.name).toLowerCase().includes(searchText)
    );

    if (filtered.length === 0) {
        table.innerHTML =
            '<tr><td colspan="5">No employees found.</td></tr>';
        return;
    }

    filtered.forEach(employee => {
        const row = document.createElement("tr");

        [
            employee.employee_id,
            employee.name,
            employee.department,
            money(employee.basic_salary)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
            if (!confirm(
                `Are you sure you want to delete ${employee.name}?`
            )) {
                return;
            }

            try {
                const response = await fetch(
                    `${API_URL}/${employee.employee_id}`,
                    { method: "DELETE" }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Delete failed.");
                }

                alert("Employee deleted successfully!");
                await loadEmployees();

            } catch (error) {
                alert(error.message);
            }
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        table.appendChild(row);
    });
}

// Add an employee to the database
document.getElementById("employeeForm").addEventListener(
    "submit",
    async function(event) {
        event.preventDefault();

        const name = document.getElementById("empName").value.trim();
        const department =
            document.getElementById("department").value.trim();
        const salary = Number(
            document.getElementById("salary").value
        );

        if (!name || !department || !Number.isFinite(salary) || salary < 0) {
            alert("Please enter valid employee details.");
            return;
        }

        const payload = {
            name: name,
            department: department,
            designation: "Not specified",
            basic_salary: salary
        };

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not add employee.");
            }

            this.reset();
            await loadEmployees();
            alert(data.message || "Employee added successfully!");

        } catch (error) {
            console.error(error);
            alert(
                error.message +
                "\n\nMake sure Flask is running and the API accepts this data."
            );
        }
    }
);

// Search as the user types
document.getElementById("search").addEventListener(
    "input",
    renderEmployees
);

// Calculate salary in the calculator
function calculateSalary() {
    const basic = Number(document.getElementById("basic").value);
    const allowances = Number(
        document.getElementById("allowances").value
    );
    const deductions = Number(
        document.getElementById("deductions").value
    );

    if (
        !Number.isFinite(basic) ||
        !Number.isFinite(allowances) ||
        !Number.isFinite(deductions) ||
        basic < 0 ||
        allowances < 0 ||
        deductions < 0
    ) {
        alert("Enter valid, non-negative salary amounts.");
        return;
    }

    const gross = basic + allowances;
    const net = gross - deductions;

    document.getElementById("gross").textContent = money(gross);
    document.getElementById("net").textContent = money(net);
}

// Initialize the page
document.getElementById("search").value = "";
loadEmployees();
calculateSalary();


async function savePayroll() {
    const employeeId = prompt(
        "Enter the numeric Employee ID to save payroll for:"
    );

    if (!employeeId || !/^\d+$/.test(employeeId) || Number(employeeId) < 1) {
        alert("Please enter a valid numeric Employee ID.");
        return;
    }

    try {
        // Check that the employee exists and calculate payroll
        const response = await fetch(
            `${API_URL}/${employeeId}/payroll`,
            { method: "GET" }
        );

        const payroll = await response.json();

        if (!response.ok) {
            throw new Error(payroll.error || "Could not calculate payroll.");
        }

        // Save the calculated payroll in MySQL
        const saveResponse = await fetch(
            `${API_URL}/${employeeId}/payroll`,
            { method: "POST" }
        );

        const saved = await saveResponse.json();

        if (!saveResponse.ok) {
            throw new Error(saved.error || "Could not save payroll.");
        }

        alert(
            "Payroll saved successfully!\n\n" +
            "Employee: " + saved.name + "\n" +
            "Payroll month: " + saved.payroll_month + "\n" +
            "Gross salary: " + money(saved.gross_salary) + "\n" +
            "Net salary: " + money(saved.net_salary)
        );

    } catch (error) {
        console.error("Payroll save error:", error);
        alert(error.message);
    }
}

async function viewPayrollHistory() {
    const employeeId = prompt("Enter the numeric Employee ID:");

    if (!employeeId || !/^\d+$/.test(employeeId) || Number(employeeId) < 1) {
        alert("Please enter a valid numeric Employee ID.");
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/${employeeId}/payroll/history`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not load payroll history.");
        }

        if (data.payroll_history.length === 0) {
            alert(`No saved payroll history found for ${data.name}.`);
            return;
        }

        const historyText = data.payroll_history.map(record =>
            `Payroll Month: ${record.payroll_month}\n` +
            `Basic Salary: ${money(record.basic_salary)}\n` +
            `HRA: ${money(record.hra)}\n` +
            `Other Allowance: ${money(record.other_allowance)}\n` +
            `Gross Salary: ${money(record.gross_salary)}\n` +
            `Deductions: ${money(record.deductions)}\n` +
            `Net Salary: ${money(record.net_salary)}`
        ).join("\n\n--------------------\n\n");

        alert(`Payroll History: ${data.name}\n\n${historyText}`);

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function generatePayslip() {
    const employeeId = prompt("Enter the numeric Employee ID:");

    if (!employeeId || !/^\d+$/.test(employeeId) || Number(employeeId) < 1) {
        alert("Please enter a valid numeric Employee ID.");
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/${employeeId}/payroll/history`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not retrieve payroll.");
        }

        if (!data.payroll_history || data.payroll_history.length === 0) {
            alert("No saved payroll record found. Save payroll first.");
            return;
        }

        const record = data.payroll_history[0];

        const payslipWindow = window.open("", "_blank");

        if (!payslipWindow) {
            alert("Please allow pop-ups for this website and try again.");
            return;
        }

        const escapeHTML = value => String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );

        payslipWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Employee Payslip</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 700px;
                        margin: 35px auto;
                        padding: 24px;
                        color: #222;
                    }
                    h1, h2 { text-align: center; }
                    .details { line-height: 1.9; }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        padding: 12px;
                        border: 1px solid #ccc;
                        text-align: left;
                    }
                    th:last-child, td:last-child { text-align: right; }
                    .net {
                        text-align: right;
                        font-size: 22px;
                        font-weight: bold;
                        margin-top: 24px;
                    }
                    button {
                        padding: 10px 18px;
                        cursor: pointer;
                    }
                    @media print {
                        button { display: none; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <h1>EMPLOYEE PAYSLIP</h1>
                <h2>Employee Payroll Management System</h2>

                <div class="details">
                    <strong>Employee Name:</strong> ${escapeHTML(data.name)}<br>
                    <strong>Employee ID:</strong> ${escapeHTML(data.employee_id)}<br>
                    <strong>Payroll Month:</strong> ${escapeHTML(record.payroll_month)}<br>
                    <strong>Payroll ID:</strong> ${escapeHTML(record.payroll_id)}
                </div>

                <table>
                    <thead>
                        <tr><th>Salary Component</th><th>Amount (INR)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Basic Salary</td><td>${money(record.basic_salary)}</td></tr>
                        <tr><td>House Rent Allowance (HRA)</td><td>${money(record.hra)}</td></tr>
                        <tr><td>Other Allowance</td><td>${money(record.other_allowance)}</td></tr>
                        <tr><td><strong>Gross Salary</strong></td><td><strong>${money(record.gross_salary)}</strong></td></tr>
                        <tr><td>Deductions</td><td>${money(record.deductions)}</td></tr>
                    </tbody>
                </table>

                <p class="net">Net Salary: ${money(record.net_salary)}</p>
                <p>This payslip was generated from the saved payroll record.</p>
                <button onclick="window.print()">Print / Save as PDF</button>
            </body>
            </html>
        `);

        payslipWindow.document.close();

    } catch (error) {
        console.error("Payslip error:", error);
        alert(error.message);
    }
}