
from flask import Flask, jsonify
from flask_cors import CORS
from employees import employees_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(employees_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "Employee Payroll Management System",
        "status": "Backend is running!"
    })


@app.route("/api/health")
def health():
    return jsonify({"status": "OK"})


if __name__ == "__main__":
    app.run(debug=True)