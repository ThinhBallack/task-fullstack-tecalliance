import sqlite3
import os
from datetime import datetime

DB_PATH = "torque_data.db"

def get_db_connection():
    """Establish a connection to the SQLite database file."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Helps to retrieve data in a dictionary-like format, making it easier to process and return as JSON.
    return conn

def init_db():
    """Initialize the table structure if it does not already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. The table to store the overall information of each upload.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            upload_time TEXT NOT NULL,
            document_date TEXT
        )
    """)
    
    # 2. The table shows details of validation errors from that upload.
    cursor.execute("""
       CREATE TABLE IF NOT EXISTS validations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER NOT NULL,
            code TEXT,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            validator TEXT NOT NULL,
            FOREIGN KEY (upload_id) REFERENCES uploads (id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

def save_upload_result(filename: str, document_date: str, validations: list) -> int:
    """Save upload results to the database and return the upload ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Save to uploads Table
    upload_time = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO uploads (filename, upload_time, document_date) VALUES (?, ?, ?)",
        (filename, upload_time, document_date)
    )
    upload_id = cursor.lastrowid
    
    # Save all errors to the validations table (if applicable).
    if validations:
        validation_data = [
            (upload_id, v.code, v.severity, v.message, v.validator)
            for v in validations
        ]
        cursor.executemany(
            "INSERT INTO validations (upload_id, code, severity, message, validator) VALUES (?, ?, ?, ?, ?)",
            validation_data
        )
    
    conn.commit()
    conn.close()
    return upload_id

def get_upload_history():
    """Get a history list of all upload attempts along with the number of errors."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Query combining the number of errors for each file.
    query = """
        SELECT u.id, u.filename, u.upload_time, u.document_date,
               COUNT(v.id) as total_issues,
               SUM(CASE WHEN v.severity = 'error' THEN 1 ELSE 0 END) as error_count,
               SUM(CASE WHEN v.severity = 'warning' THEN 1 ELSE 0 END) as warning_count
        FROM uploads u
        LEFT JOIN validations v ON u.id = v.upload_id
        GROUP BY u.id
        ORDER BY u.upload_time DESC
    """
    cursor.execute(query)
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return history