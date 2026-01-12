from app import models

print("--- UserRole Enum ---")
for role in models.UserRole:
    print(f"{role.name}: {role.value}")

print(f"\nType of 'admin': {type('admin')}")
print(f"Is 'admin' in UserRole? {'admin' in list(models.UserRole)}")
