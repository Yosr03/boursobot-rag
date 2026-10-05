from __future__ import annotations



import hashlib

import hmac

import os

import secrets

import sqlite3

from datetime import datetime

from pathlib import Path

from typing import Any, Optional





# ============================================================

# CONFIGURATION DATABASE

# ============================================================



BASE_DIR = Path(__file__).resolve().parent



DATA_DIR = BASE_DIR / "app_data"

DATA_DIR.mkdir(parents=True, exist_ok=True)



DB_PATH = DATA_DIR / "chatdb.db"





# ============================================================

# CONNEXION SQLITE

# ============================================================



def _connect() -> sqlite3.Connection:

    conn = sqlite3.connect(DB_PATH)



    conn.row_factory = sqlite3.Row



    # Active les FOREIGN KEY + ON DELETE CASCADE

    conn.execute("PRAGMA foreign_keys = ON")



    return conn





# ============================================================

# PASSWORD HASHING

# ============================================================



def _hash_password(

    password: str,

    salt: bytes | None = None,

) -> str:



    salt = salt or secrets.token_bytes(16)



    digest = hashlib.pbkdf2_hmac(

        "sha256",

        password.encode("utf-8"),

        salt,

        120_000,

    )



    return (

        f"pbkdf2_sha256$120000$"

        f"{salt.hex()}${digest.hex()}"

    )





def _verify_password(

    password: str,

    stored: str,

) -> bool:



    try:



        algorithm, iterations, salt_hex, digest_hex = (

            stored.split("$")

        )



        if algorithm != "pbkdf2_sha256":

            return False



        candidate = hashlib.pbkdf2_hmac(

            "sha256",

            password.encode("utf-8"),

            bytes.fromhex(salt_hex),

            int(iterations),

        ).hex()



        return hmac.compare_digest(

            candidate,

            digest_hex,

        )



    except (ValueError, TypeError):



        return False





# ============================================================

# INITIALISATION DATABASE

# ============================================================



def init_db() -> None:



    with _connect() as conn:



        conn.executescript(

            """



            CREATE TABLE IF NOT EXISTS users (



                id INTEGER PRIMARY KEY AUTOINCREMENT,



                first_name TEXT NOT NULL,



                last_name TEXT NOT NULL,



                username TEXT UNIQUE NOT NULL,



                email TEXT UNIQUE NOT NULL,



                password_hash TEXT NOT NULL,



                role TEXT NOT NULL

                    CHECK(role IN ('user', 'admin')),



                suspended INTEGER NOT NULL DEFAULT 0,



                created_at TEXT NOT NULL

            );





            CREATE TABLE IF NOT EXISTS conversations (



                id INTEGER PRIMARY KEY AUTOINCREMENT,



                user_id INTEGER NOT NULL,



                title TEXT NOT NULL

                    DEFAULT 'Nouveau chat',



                created_at TEXT NOT NULL,



                updated_at TEXT NOT NULL,



                FOREIGN KEY(user_id)

                    REFERENCES users(id)

                    ON DELETE CASCADE

            );





            CREATE TABLE IF NOT EXISTS messages (



                id INTEGER PRIMARY KEY AUTOINCREMENT,



                conversation_id INTEGER NOT NULL,



                role TEXT NOT NULL

                    CHECK(role IN ('user', 'assistant')),



                content TEXT NOT NULL,



                sources_json TEXT,



                created_at TEXT NOT NULL,



                FOREIGN KEY(conversation_id)

                    REFERENCES conversations(id)

                    ON DELETE CASCADE

            );





            CREATE INDEX IF NOT EXISTS

            idx_conversations_user



            ON conversations(

                user_id,

                updated_at DESC

            );





            CREATE INDEX IF NOT EXISTS

            idx_messages_conversation



            ON messages(

                conversation_id,

                id ASC

            );



            """

        )



        # ====================================================

        # MIGRATION POUR UNE BASE EXISTANTE

        # ====================================================



        columns = conn.execute(

            "PRAGMA table_info(users)"

        ).fetchall()



        column_names = {

            row["name"]

            for row in columns

        }



        if "suspended" not in column_names:



            conn.execute(

                """

                ALTER TABLE users

                ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0

                """

            )



        if "last_seen" not in column_names:

            conn.execute(

                """

                ALTER TABLE users

                ADD COLUMN last_seen TEXT

                """

        )





    with _connect() as conn:
        if "model_provider" not in {r["name"] for r in conn.execute("PRAGMA table_info(messages)")} :
            conn.execute("ALTER TABLE messages ADD COLUMN model_provider TEXT")

    _seed_demo_users()
    _remove_legacy_demo_admin()





# ============================================================

# USERNAME

# ============================================================



def _make_username(

    first_name: str,

    last_name: str,

    email: str,

) -> str:



    base = (

        f"{first_name.strip()}.{last_name.strip()}"

        .lower()

        .replace(" ", "")

    )



    if not base:



        base = email.split("@")[0].lower()



    username = base



    counter = 2



    with _connect() as conn:



        while conn.execute(

            "SELECT id FROM users WHERE username = ?",

            (username,),

        ).fetchone():



            username = f"{base}{counter}"



            counter += 1



    return username





# ============================================================

# DEMO USERS

# ============================================================



def _remove_legacy_demo_admin() -> None:
    """Migration ciblée : sauvegarder puis retirer l'ancien admin de démo."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE lower(email) = ?",
            ("admin@boursobot.local",),
        ).fetchone()
        if not row:
            return
        backup_path = DATA_DIR / ("avant_suppression_admin_demo_" +
                                 datetime.now().strftime("%Y%m%d_%H%M%S") + ".db.bak")
        with sqlite3.connect(backup_path) as backup:
            conn.backup(backup)
        # FOREIGN KEY / ON DELETE CASCADE supprime ses conversations et messages.
        conn.execute("DELETE FROM users WHERE id = ?", (row["id"],))


def _seed_demo_users() -> None:









    user_username = os.getenv(

        "USER_USERNAME",

        "user",

    )



    user_password = os.getenv(

        "USER_PASSWORD",

        "user123",

    )



    now = datetime.now().isoformat(

        timespec="seconds"

    )



    users = [






        (

            user_username,

            "user@boursobot.local",

            "Utilisateur",

            "BoursoBot",

            user_password,

            "user",

        ),



    ]



    with _connect() as conn:



        for (

            username,

            email,

            first_name,

            last_name,

            password,

            role,

        ) in users:



            exists = conn.execute(

                """

                SELECT id

                FROM users

                WHERE username = ?

                   OR email = ?

                """,

                (

                    username,

                    email,

                ),

            ).fetchone()



            if not exists:



                conn.execute(

                    """

                    INSERT INTO users(

                        username,

                        email,

                        first_name,

                        last_name,

                        password_hash,

                        role,

                        suspended,

                        created_at

                    )



                    VALUES (?, ?, ?, ?, ?, ?, 0, ?)

                    """,

                    (

                        username,

                        email,

                        first_name,

                        last_name,

                        _hash_password(password),

                        role,

                        now,

                    ),

                )





# ============================================================

# CREATE USER

# ============================================================



def create_user(

    first_name: str,

    last_name: str,

    email: str,

    password: str,

) -> Optional[dict[str, Any]]:



    first_name = first_name.strip()

    last_name = last_name.strip()

    email = email.strip().lower()



    if not first_name:

        raise ValueError("Le prénom est requis.")



    if not last_name:

        raise ValueError("Le nom est requis.")



    if not email:

        raise ValueError(

            "L'adresse email est requise."

        )



    if not password:

        raise ValueError(

            "Le mot de passe est requis."

        )



    with _connect() as conn:



        existing = conn.execute(

            """

            SELECT id

            FROM users

            WHERE email = ?

            """,

            (email,),

        ).fetchone()



        if existing:



            raise ValueError(

                "Cette adresse email est déjà utilisée."

            )



        username = _make_username(

            first_name,

            last_name,

            email,

        )



        now = datetime.now().isoformat(

            timespec="seconds"

        )



        cursor = conn.execute(

            """

            INSERT INTO users(

                username,

                email,

                first_name,

                last_name,

                password_hash,

                role,

                suspended,

                created_at

            )



            VALUES (?, ?, ?, ?, ?, ?, 0, ?)

            """,

            (

                username,

                email,

                first_name,

                last_name,

                _hash_password(password),

                "user",

                now,

            ),

        )



        user_id = int(cursor.lastrowid)



    return {

        "id": user_id,

        "username": username,

        "email": email,

        "first_name": first_name,

        "last_name": last_name,

        "name": f"{first_name} {last_name}",

        "role": "user",

        "suspended": False,

    }





# ============================================================

# AUTHENTIFICATION

# ============================================================



def authenticate_user(

    email: str,

    password: str,

) -> Optional[dict[str, Any]]:



    email = email.strip().lower()



    if not email or not password:

        return None



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT

                id,

                username,

                email,

                first_name,

                last_name,

                password_hash,

                role,

                suspended



            FROM users



            WHERE email = ?

            """,

            (email,),

        ).fetchone()



    if not row:



        return None



    # ========================================================

    # COMPTE SUSPENDU

    # ========================================================



    if bool(row["suspended"]):



        raise PermissionError(

            "Votre compte a été suspendu par un administrateur."

        )



    if not _verify_password(

        password,

        row["password_hash"],

    ):



        return None



    return {

        "id": row["id"],

        "username": row["username"],

        "email": row["email"],

        "first_name": row["first_name"],

        "last_name": row["last_name"],

        "name": (

            f"{row['first_name']} "

            f"{row['last_name']}"

        ),

        "role": row["role"],

        "suspended": bool(row["suspended"]),

    }





# ============================================================

# ADMIN - ROLE

# ============================================================



def get_user_role(

    user_id: int,

) -> Optional[str]:



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT role

            FROM users

            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



    if not row:

        return None



    return row["role"]





# ============================================================

# ADMIN - LISTE DES UTILISATEURS

# ============================================================



def list_all_users() -> list[dict[str, Any]]:



    with _connect() as conn:



        rows = conn.execute(

            """

            SELECT

                u.id,

                u.first_name,

                u.last_name,

                u.username,

                u.email,

                u.role,

                u.suspended,

                u.created_at,



                COUNT(c.id) AS conversations



            FROM users u



            LEFT JOIN conversations c

                ON c.user_id = u.id



            GROUP BY

                u.id,

                u.first_name,

                u.last_name,

                u.username,

                u.email,

                u.role,

                u.suspended,

                u.created_at



            ORDER BY

                u.created_at DESC,

                u.id DESC

            """

        ).fetchall()



    return [

        {

            "id": row["id"],

            "first_name": row["first_name"],

            "last_name": row["last_name"],

            "username": row["username"],

            "email": row["email"],

            "role": row["role"],

            "suspended": bool(row["suspended"]),

            "created_at": row["created_at"],

            "conversations": int(

                row["conversations"]

            ),

        }

        for row in rows

    ]





# ============================================================

# ADMIN - MODIFIER ROLE

# ============================================================



def set_user_role(

    user_id: int,

    role: str,

) -> dict[str, Any]:



    if role not in {

        "user",

        "admin",

    }:



        raise ValueError(

            "Rôle invalide."

        )



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT id

            FROM users

            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



        if not row:



            raise ValueError(

                "Utilisateur introuvable."

            )



        conn.execute(

            """

            UPDATE users



            SET role = ?



            WHERE id = ?

            """,

            (

                role,

                user_id,

            ),

        )



        updated = conn.execute(

            """

            SELECT

                id,

                first_name,

                last_name,

                username,

                email,

                role,

                suspended,

                created_at



            FROM users



            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



    return dict(updated)





# ============================================================

# ADMIN - SUSPENDRE / REACTIVER

# ============================================================



def set_user_suspended(

    user_id: int,

    suspended: bool,

) -> dict[str, Any]:



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT id

            FROM users

            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



        if not row:



            raise ValueError(

                "Utilisateur introuvable."

            )



        conn.execute(

            """

            UPDATE users



            SET suspended = ?



            WHERE id = ?

            """,

            (

                1 if suspended else 0,

                user_id,

            ),

        )



        updated = conn.execute(

            """

            SELECT

                id,

                first_name,

                last_name,

                username,

                email,

                role,

                suspended,

                created_at



            FROM users



            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



    return dict(updated)





# ============================================================

# ADMIN - SUPPRIMER UTILISATEUR

# ============================================================



def delete_user(

    user_id: int,

) -> None:



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT id

            FROM users

            WHERE id = ?

            """,

            (user_id,),

        ).fetchone()



        if not row:



            raise ValueError(

                "Utilisateur introuvable."

            )



        conn.execute(

            """

            DELETE FROM users

            WHERE id = ?

            """,

            (user_id,),

        )





# ============================================================

# CONVERSATIONS

# ============================================================



def create_conversation(

    user_id: int,

    title: str = "Nouveau chat",

) -> int:



    now = datetime.now().isoformat(

        timespec="seconds"

    )



    with _connect() as conn:



        cursor = conn.execute(

            """

            INSERT INTO conversations(

                user_id,

                title,

                created_at,

                updated_at

            )



            VALUES (?, ?, ?, ?)

            """,

            (

                user_id,

                title[:80] or "Nouveau chat",

                now,

                now,

            ),

        )



        return int(cursor.lastrowid)





def list_conversations(

    user_id: int,

) -> list[dict[str, Any]]:



    with _connect() as conn:



        rows = conn.execute(

            """

            SELECT

                id,

                title,

                created_at,

                updated_at



            FROM conversations



            WHERE user_id = ?



            ORDER BY

                updated_at DESC,

                id DESC

            """,

            (user_id,),

        ).fetchall()



    return [

        dict(row)

        for row in rows

    ]





def get_conversation(

    conversation_id: int,

    user_id: int,

) -> Optional[dict[str, Any]]:



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT

                id,

                title,

                created_at,

                updated_at



            FROM conversations



            WHERE id = ?

              AND user_id = ?

            """,

            (

                conversation_id,

                user_id,

            ),

        ).fetchone()



    return (

        dict(row)

        if row

        else None

    )





def rename_conversation(

    conversation_id: int,

    user_id: int,

    title: str,

) -> None:



    now = datetime.now().isoformat(

        timespec="seconds"

    )



    with _connect() as conn:



        conn.execute(

            """

            UPDATE conversations



            SET

                title = ?,

                updated_at = ?



            WHERE id = ?

              AND user_id = ?

            """,

            (

                title.strip()[:80]

                or "Nouveau chat",

                now,

                conversation_id,

                user_id,

            ),

        )





def delete_conversation(

    conversation_id: int,

    user_id: int,

) -> None:



    with _connect() as conn:



        conn.execute(

            """

            DELETE FROM conversations



            WHERE id = ?

              AND user_id = ?

            """,

            (

                conversation_id,

                user_id,

            ),

        )





# ============================================================

# MESSAGES

# ============================================================



def save_message(

    conversation_id: int,

    user_id: int,

    role: str,

    content: str,

    sources_json: str | None = None,
    model_provider: str | None = None,

) -> None:



    if role not in {

        "user",

        "assistant",

    }:



        raise ValueError(

            "role must be 'user' or 'assistant'"

        )



    now = datetime.now().isoformat(

        timespec="seconds"

    )



    with _connect() as conn:
        if "model_provider" not in {r["name"] for r in conn.execute("PRAGMA table_info(messages)")} :
            conn.execute("ALTER TABLE messages ADD COLUMN model_provider TEXT")



        owned = conn.execute(

            """

            SELECT id

            FROM conversations



            WHERE id = ?

              AND user_id = ?

            """,

            (

                conversation_id,

                user_id,

            ),

        ).fetchone()



        if not owned:



            raise PermissionError(

                "Conversation introuvable ou non autorisée."

            )



        conn.execute(

            """

            INSERT INTO messages(

                conversation_id,

                role,

                content,

                sources_json,

                created_at,
                model_provider

            )



            VALUES (?, ?, ?, ?, ?, ?)

            """,

            (

                conversation_id,

                role,

                content,

                sources_json,

                now,
                model_provider if role == "assistant" else None,

            ),

        )



        conn.execute(

            """

            UPDATE conversations



            SET updated_at = ?



            WHERE id = ?

              AND user_id = ?

            """,

            (

                now,

                conversation_id,

                user_id,

            ),

        )





def list_messages(

    conversation_id: int,

    user_id: int,

) -> list[dict[str, Any]]:



    with _connect() as conn:



        rows = conn.execute(

            """

            SELECT

                m.id,

                m.role,

                m.content,

                m.sources_json,

                m.created_at



            FROM messages m



            JOIN conversations c

              ON c.id = m.conversation_id



            WHERE m.conversation_id = ?

              AND c.user_id = ?



            ORDER BY m.id ASC

            """,

            (

                conversation_id,

                user_id,

            ),

        ).fetchall()



    return [

        dict(row)

        for row in rows

    ]





# ============================================================

# STATISTIQUES UTILISATEUR

# ============================================================



def count_user_conversations(

    user_id: int,

) -> int:



    with _connect() as conn:



        row = conn.execute(

            """

            SELECT COUNT(*) AS n



            FROM conversations



            WHERE user_id = ?

            """,

            (user_id,),

        ).fetchone()



    return int(row["n"])





# ============================================================

# STATISTIQUES ADMIN

# ============================================================



def admin_stats() -> dict[str, int]:



    with _connect() as conn:



        users = conn.execute(

            """

            SELECT COUNT(*) AS n

            FROM users

            """

        ).fetchone()["n"]



        conversations = conn.execute(

            """

            SELECT COUNT(*) AS n

            FROM conversations

            """

        ).fetchone()["n"]



        messages = conn.execute(

            """

            SELECT COUNT(*) AS n

            FROM messages

            """

        ).fetchone()["n"]



    return {

        "users": int(users),

        "conversations": int(conversations),

        "messages": int(messages),

    }







def admin_list_conversations() -> list[dict]:



    with _connect() as conn:



        rows = conn.execute(

            """

            SELECT

                c.id,

                c.user_id,

                u.first_name,

                u.last_name,

                u.email,

                c.title,

                c.created_at,

                c.updated_at,

                COUNT(m.id) AS messages

            FROM conversations c

            JOIN users u

                ON u.id = c.user_id

            LEFT JOIN messages m

                ON m.conversation_id = c.id

            GROUP BY

                c.id,

                c.user_id,

                u.first_name,

                u.last_name,

                u.email,

                c.title,

                c.created_at,

                c.updated_at

            ORDER BY c.updated_at DESC

            """

        ).fetchall()



    return [dict(row) for row in rows]

# ============================================================

# DEBUG

# ============================================================



def debug_users_table():



    with _connect() as conn:



        rows = conn.execute(

            "PRAGMA table_info(users)"

        ).fetchall()



    for row in rows:



        print(dict(row))





def update_last_seen(user_id: int):

    import sqlite3

    from datetime import datetime



    db = sqlite3.connect("app_data/chatdb.db")



    db.execute(

        "UPDATE users SET last_seen = ? WHERE id = ?",

        (datetime.now().isoformat(), user_id)

    )



    db.commit()

    db.close()



# ============================================================

init_db()


