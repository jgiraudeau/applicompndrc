import sqlite3

def inspect():
    conn = sqlite3.connect("profvirtuel.db")
    cursor = conn.cursor()
    print("--- Users ---")
    rows = cursor.execute("SELECT email, role, status FROM users").fetchall()
    for row in rows:
        print(row)
    conn.close()

if __name__ == "__main__":
    inspect()
