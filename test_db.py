
from db import get_db_connection

connection = get_db_connection()

if connection and connection.is_connected():
    print("SUCCESS! Connected to MySQL database.")

    cursor = connection.cursor()
    cursor.execute("SELECT * FROM employees")

    for employee in cursor.fetchall():
        print(employee)

    cursor.close()
    connection.close()
else:
    print("Connection failed. Check db.py and your MySQL Server.")