import sqlite3

def fix_enums():
    conn = sqlite3.connect("profvirtuel.db")
    cursor = conn.cursor()
    
    print("Fixing ROLES (Uppercase -> Lowercase)...")
    # ADMIN -> admin
    cursor.execute("UPDATE users SET role='admin' WHERE role='ADMIN'")
    # TEACHER -> teacher
    cursor.execute("UPDATE users SET role='teacher' WHERE role='TEACHER'")
    # STUDENT -> student
    cursor.execute("UPDATE users SET role='student' WHERE role='STUDENT'")
    # SCHOOL_ADMIN -> school_admin
    cursor.execute("UPDATE users SET role='school_admin' WHERE role='SCHOOL_ADMIN'")
    
    conn.commit()
    print("✅ Roles fixed.")
    
    # Verify
    rows = cursor.execute("SELECT email, role FROM users").fetchall()
    for row in rows:
        print(row)
        
    conn.close()

if __name__ == "__main__":
    fix_enums()
