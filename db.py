
import mysql.connector
from mysql.connector import Error


def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host="localhost",
            port=3306,
            user="root",
            password="Varshayh@8",
            database="employee_payroll"
        )
        return connection

    except Error as error:
        print("Database connection failed:", error)
        return None