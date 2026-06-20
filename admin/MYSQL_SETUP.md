# MySQL / XAMPP Setup

The Flask app now creates everything automatically on startup:

1. Connects to MySQL.
2. Runs `CREATE DATABASE IF NOT EXISTS firm_db`.
3. Runs `CREATE TABLE IF NOT EXISTS` for `admins`, `projects`, `reviews`, `contacts`, and `services`.
4. Creates the default admin account.
5. Migrates `data/store.json` into MySQL without duplicate imports.

## XAMPP

1. Open XAMPP Control Panel.
2. Start `Apache` if you want phpMyAdmin.
3. Start `MySQL`.
4. Install Python dependencies:

```powershell
cd Firm\admin
pip install -r requirements.txt
```

5. Run Flask:

```powershell
python app.py
```

6. Open the admin panel:

```text
http://127.0.0.1:5000/
```

Default login:

```text
Email: admin@firm.com
Password: admin123
```

## phpMyAdmin

1. Start Apache and MySQL in XAMPP.
2. Open:

```text
http://localhost/phpmyadmin
```

3. After the first Flask run, select `firm_db`.
4. Confirm the tables exist:

```text
admins
projects
reviews
contacts
services
```

No manual database or table creation is required.

## Environment Variables

The defaults match a typical XAMPP MySQL install:

```text
FIRM_DB_HOST=127.0.0.1
FIRM_DB_PORT=3306
FIRM_DB_USER=root
FIRM_DB_PASSWORD=
FIRM_DB_NAME=firm_db
```

Set them only if your local MySQL credentials differ.

## Manual Migration Command

Migration runs automatically on app startup. You can also run it directly:

```powershell
cd Firm\admin
python migration.py
```
