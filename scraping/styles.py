import streamlit as st

BLUE = "#003883"
PURPLE = "#642080"
PINK = "#D20073"
TEXT = "#14213D"
MUTED = "#667085"

def inject_css() -> None:

    st.markdown(
        f"""
<style>

@import url(
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
);

/* ============================================================
   GLOBAL
   ============================================================ */

html,
body,
[class*="css"] {{
    font-family: Inter, sans-serif;
}}

.stApp {{
    background: #ffffff;
    color: {TEXT};
}}

#MainMenu,
footer,
[data-testid="stHeader"] {{
    visibility: hidden;
    height: 0;
}}

[data-testid="stAppViewContainer"] > .main {{
    padding-top: 0 !important;
}}

.block-container {{
    max-width: 1400px;
    padding-top: 1rem !important;
}}

button {{
    font-family: Inter, sans-serif !important;
}}


/* ============================================================
   LOGIN PAGE
   ============================================================ */

/*
   IMPORTANT :
   Streamlit rend le st.form séparément du HTML.
   Les trois blocs ont donc exactement la même largeur,
   les mêmes bordures et le même fond pour former visuellement
   UNE SEULE carte.
*/

.login-page {{
    min-height: calc(100vh - 35px);

    width: 100%;

    display: flex;
    flex-direction: column;
    align-items: center;

    box-sizing: border-box;

    padding-top: 30px;
    padding-bottom: 25px;

    background:
        radial-gradient(
            circle at 15% 20%,
            rgba(0, 56, 131, 0.045),
            transparent 30%
        ),
        radial-gradient(
            circle at 85% 80%,
            rgba(210, 0, 115, 0.035),
            transparent 30%
        );
}}


/* ============================================================
   LOGO
   ============================================================ */

.login-brand-top {{
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    margin-bottom: 21px;
}}

.login-brand-icon {{
    width: 37px;
    height: 37px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    color: #ffffff;

    font-size: 17px;
    font-weight: 700;

    background:
        linear-gradient(
            135deg,
            {BLUE} 0%,
            {PURPLE} 52%,
            {PINK} 100%
        );

    box-shadow:
        0 7px 19px
        rgba(0, 56, 131, 0.16);
}}

.login-brand-text {{
    font-size: 22px;
    line-height: 1;

    font-weight: 800;

    letter-spacing: -0.045em;
}}

.brand-blue {{
    color: {BLUE};
}}

.brand-pink {{
    color: {PINK};
}}


/* ============================================================
   LOGIN CARD — HEADER
   ============================================================ */

.login-card-header {{
    width: 470px;

    box-sizing: border-box;

    margin: 0 auto;

    overflow: hidden;

    background: #ffffff;

    border:
        1px solid #e1e7ef;

    border-bottom:
        0;

    border-radius:
        10px 10px 0 0;

    box-shadow:
        0 16px 42px
        rgba(0, 56, 131, 0.075);
}}

.login-card-top {{
    width: 100%;
    height: 5px;

    background:
        linear-gradient(
            90deg,
            {BLUE} 0%,
            {PURPLE} 52%,
            {PINK} 100%
        );
}}

.login-card-content {{
    padding:
        28px 52px 19px;

    text-align: center;
}}

.login-icon-circle {{
    width: 53px;
    height: 53px;

    margin:
        0 auto 15px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    color: #ffffff;

    font-size: 18px;
    font-weight: 700;

    background:
        linear-gradient(
            135deg,
            {BLUE} 0%,
            {PURPLE} 52%,
            {PINK} 100%
        );

    box-shadow:
        0 8px 19px
        rgba(0, 56, 131, 0.16);
}}

.login-card-content h1 {{
    margin:
        0 0 7px;

    color: {BLUE};

    font-size: 27px;
    line-height: 1.15;

    font-weight: 600;

    letter-spacing: -0.035em;
}}

.login-subtitle {{
    max-width: 330px;

    margin:
        0 auto 14px;

    color: #69798d;

    font-size: 11px;

    line-height: 1.55;
}}

.login-secure-badge {{
    display: inline-flex;

    align-items: center;
    justify-content: center;

    gap: 7px;

    padding:
        6px 13px;

    border:
        1px solid #dce4ee;

    border-radius:
        999px;

    color: {BLUE};

    background:
        #fcfdff;

    font-size: 9px;

    font-weight: 600;
}}

.secure-icon {{
    color: #27a45b;

    font-size: 8px;
}}


/* ============================================================
   LOGIN FORM
   ============================================================ */

div[data-testid="stForm"] {{
    width: 470px !important;

    box-sizing: border-box !important;

    margin:
        0 auto !important;

    padding:
        6px 52px 23px !important;

    background:
        #ffffff !important;

    border:
        1px solid #e1e7ef !important;

    border-top:
        0 !important;

    border-bottom:
        0 !important;

    border-radius:
        0 !important;

    box-shadow:
        none !important;
}}


/* Labels */

div[data-testid="stForm"] label {{
    color: #344963 !important;

    font-size: 10px !important;

    font-weight: 500 !important;
}}


/* Inputs */

div[data-testid="stForm"] [data-baseweb="input"] {{
    border:
        0 !important;

    background:
        transparent !important;

    box-shadow:
        none !important;
}}

div[data-testid="stForm"] input {{
    width: 100% !important;

    height: 42px !important;

    padding:
        0 3px !important;

    border:
        0 !important;

    border-bottom:
        1px solid #c5cfdb !important;

    border-radius:
        0 !important;

    background:
        transparent !important;

    color:
        #203650 !important;

    font-size:
        11px !important;

    box-shadow:
        none !important;
}}

div[data-testid="stForm"] input:focus {{
    border-bottom:
        2px solid {PINK} !important;

    box-shadow:
        none !important;
}}

div[data-testid="stForm"] input::placeholder {{
    color:
        #9aa6b5 !important;
}}


/* Checkbox */

div[data-testid="stForm"] [data-testid="stCheckbox"] {{
    margin-top:
        3px;

    margin-bottom:
        17px;
}}

div[data-testid="stForm"] [data-testid="stCheckbox"] label {{
    color:
        #718096 !important;

    font-size:
        9px !important;
}}


/* Bouton */

div[data-testid="stForm"] button[type="submit"] {{
    width:
        100% !important;

    height:
        46px !important;

    min-height:
        46px !important;

    border:
        0 !important;

    border-radius:
        999px !important;

    color:
        #ffffff !important;

    font-size:
        11px !important;

    font-weight:
        700 !important;

    background:
        linear-gradient(
            100deg,
            {BLUE} 0%,
            {PURPLE} 52%,
            {PINK} 100%
        ) !important;

    box-shadow:
        0 8px 20px
        rgba(210, 0, 115, 0.17) !important;

    transition:
        transform 0.18s ease,
        box-shadow 0.18s ease !important;
}}

div[data-testid="stForm"] button[type="submit"]:hover {{
    color:
        #ffffff !important;

    transform:
        translateY(-1px);

    box-shadow:
        0 11px 24px
        rgba(210, 0, 115, 0.24) !important;
}}


/* ============================================================
   LOGIN CARD — FOOTER
   ============================================================ */

.login-card-footer {{
    width: 470px;

    box-sizing: border-box;

    margin:
        0 auto;

    padding:
        0 52px 22px;

    text-align: center;

    background:
        #ffffff;

    border:
        1px solid #e1e7ef;

    border-top:
        0;

    border-radius:
        0 0 10px 10px;

    box-shadow:
        0 16px 42px
        rgba(0, 56, 131, 0.075);
}}

.login-security {{
    display: flex;

    align-items: center;
    justify-content: center;

    gap: 7px;

    padding-top:
        14px;

    border-top:
        1px solid #edf1f5;

    color:
        {BLUE};

    font-size:
        9px;

    font-weight:
        600;
}}

.security-dot {{
    width: 6px;
    height: 6px;

    flex: 0 0 6px;

    border-radius:
        50%;

    background:
        #27a45b;
}}

.login-help {{
    margin-top:
        9px;

    color:
        #97a2b1;

    font-size:
        8px;

    line-height:
        1.5;
}}

.login-bottom {{
    margin-top:
        12px;

    color:
        #8794a5;

    font-size:
        8px;

    text-align:
        center;
}}


/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 650px) {{

    .login-page {{
        padding-top:
            22px;

        padding-bottom:
            20px;
    }}

    .login-card-header,
    div[data-testid="stForm"],
    .login-card-footer {{
        width:
            min(470px, calc(100vw - 28px)) !important;
    }}

    .login-card-content {{
        padding:
            26px 30px 18px;
    }}

    div[data-testid="stForm"] {{
        padding:
            6px 30px 22px !important;
    }}

    .login-card-footer {{
        padding:
            0 30px 21px;
    }}

    .login-brand-text {{
        font-size:
            21px;
    }}
}}


/* ============================================================
   SIDEBAR
   ============================================================ */

/* ============================================================
   SIDEBAR
   ============================================================ */

[data-testid="stSidebar"] {{
    background: #fbfcfe;

    border-right:
        1px solid #e8edf4;
}}

[data-testid="stSidebar"] .block-container {{
    padding:
        22px 15px !important;
}}

.brand {{
    display: flex;
    align-items: center;
    gap: 10px;

    padding:
        5px 5px 22px;
}}

.brand-mark {{
    width: 34px;
    height: 34px;

    border-radius: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    color: white;
    font-weight: 800;

    background:
        linear-gradient(
            135deg,
            {BLUE},
            {PINK}
        );
}}

.brand-name {{
    color: {BLUE};

    font-size: 15px;
    font-weight: 700;
}}

.brand-sub {{
    margin-top: 2px;

    color: #8995a6;

    font-size: 9px;
}}

.sidebar-section-title {{
    margin:
        22px 5px 9px;

    color: #8b97a8;

    font-size: 10px;
    font-weight: 700;

    text-transform: uppercase;
    letter-spacing: .08em;
}}

.sidebar-empty {{
    padding: 12px 6px;

    color: #9aa6b5;

    font-size: 11px;
}}

.sidebar-spacer {{
    min-height: 30px;
}}

.sidebar-user {{
    display: flex;
    align-items: center;
    gap: 9px;

    margin-top: 13px;
    padding: 10px 5px;

    border-top:
        1px solid #e8edf4;
}}

.sidebar-user-avatar {{
    width: 30px;
    height: 30px;

    border-radius: 50%;

    display: flex;
    align-items: center;
    justify-content: center;

    color: white;

    font-size: 11px;
    font-weight: 700;

    background:
        linear-gradient(
            135deg,
            {BLUE},
            {PINK}
        );
}}

.sidebar-user-name {{
    color: #24354c;

    font-size: 11px;
    font-weight: 600;
}}

.sidebar-user-role {{
    color: #9aa5b4;

    font-size: 9px;
}}

[data-testid="stSidebar"] button {{
    border: 0 !important;

    border-radius: 8px !important;

    color: #3d5068 !important;

    background: transparent !important;

    text-align: left !important;

    font-size: 11px !important;
}}

[data-testid="stSidebar"] button:hover {{
    background: #eef4fb !important;
    color: {BLUE} !important;
}}


/* ============================================================
   CHAT
   ============================================================ */

.chat-header {{
    display: flex;

    justify-content: space-between;
    align-items: center;

    padding:
        10px 0 16px;

    border-bottom:
        1px solid #edf0f5;

    margin-bottom: 18px;
}}

.chat-header-title {{
    color: {TEXT};

    font-size: 16px;
    font-weight: 700;
}}

.chat-header-sub {{
    margin-top: 3px;

    color: #98a2b3;

    font-size: 10px;
}}

.provider-badge {{
    display: flex;
    align-items: center;
    gap: 6px;

    padding:
        7px 11px;

    border-radius: 999px;

    border: 1px solid #e3eaf2;

    color: #64748b;

    font-size: 10px;
}}

.provider-badge span {{
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: #21a35a;
}}

.welcome-wrap {{
    max-width: 680px;

    margin:
        12vh auto 35px;

    text-align: center;
}}

.welcome-icon {{
    width: 46px;
    height: 46px;

    margin: auto;

    border-radius: 14px;

    display: flex;
    align-items: center;
    justify-content: center;

    color: white;
    font-weight: 700;

    background:
        linear-gradient(
            135deg,
            {BLUE},
            {PINK}
        );
}}

.welcome-wrap h1 {{
    margin:
        18px 0 5px;

    color: {TEXT};

    font-size: 31px;
    font-weight: 700;
}}

.welcome-wrap p {{
    margin: 0;

    color: {BLUE};

    font-size: 22px;
    font-weight: 600;
}}

.welcome-description {{
    max-width: 480px;

    margin:
        12px auto 0;

    color: #8290a3;

    font-size: 12px;
    line-height: 1.6;
}}

.source-card {{
    margin:
        8px 0;

    padding:
        11px 13px;

    border-left:
        3px solid {PINK};

    border-radius: 5px;

    background: #fbfcff;
}}

.source-title {{
    color: {TEXT};

    font-size: 11px;
    font-weight: 600;
}}

.source-meta {{
    margin-top: 5px;

    color: #8b97a8;

    font-size: 9px;
}}

.admin-card {{
    margin-top: 25px;

    padding: 24px;

    border:
        1px solid #e8edf4;

    border-radius: 12px;

    background: #ffffff;
}}

.admin-card-title {{
    color: {TEXT};

    font-size: 13px;
    font-weight: 700;
}}

.admin-pipeline {{
    margin-top: 14px;

    color: {BLUE};

    font-size: 13px;
    font-weight: 600;
}}

.admin-pipeline span {{
    margin:
        0 10px;

    color: {PINK};
}}

.page-title {{
    margin-top: 10px;

    color: {TEXT};

    font-size: 27px;
    font-weight: 750;
}}


/* ============================================================
   RESPONSIVE
   ============================================================ */

@media (max-width: 700px) {{

    .login-page {{
        padding-top: 22px;
    }}

    .login-card {{
        max-width: 100%;
    }}

    .login-card-content {{
        padding:
            30px 28px 18px;
    }}

    div[data-testid="stForm"] {{
        padding:
            10px 28px
            22px !important;
    }}

    .login-card-footer {{
        padding:
            0 28px 22px;
    }}

    .login-brand-top {{
        margin-bottom: 22px;
    }}

}}

</style>
""",
        unsafe_allow_html=True,
    )