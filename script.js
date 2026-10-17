
let employees = [
    { id: "E001", name: "Arun Kumar", department: "IT", salary: 30000 },
    { id: "E002", name: "Priya Sharma", department: "HR", salary: 35000 },
    { id: "E003", name: "Rahul Das", department: "Finance", salary: 28000 }
];

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.add("hidden");
    });

    document.getElementById(sectionId).classList.remove("hidden");
}

function updateDashboard() {
    document.getElementById("totalEmployees").textContent = employees.length;

    const total = employees.reduce((sum, employee) => {
        return sum + employee.salary;
    }, 0);

    document.getElementById("totalPayroll").textContent =
        "₹" + total.toLocaleString("en-IN");
}

function renderEmployees() {
    const table = document.getElementById("employeeTable");
    const searchText = document.getElementById("search").value.toLowerCase();

    table.innerHTML = "";

    employees
        .filter(employee =>
            employee.id.toLowerCase().includes(searchText) ||
            employee.name.toLowerCase().includes(searchText)
        )
        .forEach(employee => {
            const row = document.createElement("tr");

            [employee.id, employee.name, employee.department,
             "₹" + employee.salary.toLocaleString("en-IN")]
                .forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

            const actionCell = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", () => {
                employees = employees.filter(item => item.id !== employee.id);
                renderEmployees();
                updateDashboard();
            });

            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);
            table.appendChild(row);
        });
}

document.getElementById("employeeForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const id = document.getElementById("empId").value.trim();
    const name = document.getElementById("empName").value.trim();
    const department = document.getElementById("department").value.trim();
    const salary = Number(document.getElementById("salary").value);

    if (employees.some(employee => employee.id.toLowerCase() === id.toLowerCase())) {
        alert("This Employee ID already exists. Please use another ID.");
        return;
    }

    employees.push({ id, name, department, salary });

    this.reset();
    renderEmployees();
    updateDashboard();

    alert("Employee added successfully!");
});

document.getElementById("search").addEventListener("input", renderEmployees);

function calculateSalary() {
    const basic = Number(document.getElementById("basic").value);
    const allowances = Number(document.getElementById("allowances").value);
    const deductions = Number(document.getElementById("deductions").value);

    if (basic < 0 || allowances < 0 || deductions < 0) {
        alert("Salary amounts cannot be negative.");
        return;
    }

    const gross = basic + allowances;
    const net = gross - deductions;

    document.getElementById("gross").textContent =
        "₹" + gross.toLocaleString("en-IN");

    document.getElementById("net").textContent =
        "₹" + net.toLocaleString("en-IN");
}

renderEmployees();
updateDashboard();
calculateSalary();
