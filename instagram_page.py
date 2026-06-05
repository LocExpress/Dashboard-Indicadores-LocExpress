import os
import streamlit as st
import streamlit.components.v1 as components


def page_instagram():
    html_path = os.path.join(os.path.dirname(__file__), "instagram_analytics.html")
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except FileNotFoundError:
        st.error("Arquivo instagram_analytics.html não encontrado no repositório.")
        return

    components.html(html_content, height=1800, scrolling=True)
