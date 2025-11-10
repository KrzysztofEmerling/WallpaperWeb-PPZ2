import os
import sys

sys.path.insert(0, os.path.abspath('../../app'))

# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'WallpaperWeb'
copyright = '2025, Agnieszka Głowacka, Anastasiya Dorosh, Martyna Trębacz, Anna Waleczek, Oliwia Skucha, Jakub Rogoża, Krzysztof Emerling, Szymon Duda'
author = 'Agnieszka Głowacka, Anastasiya Dorosh, Martyna Trębacz, Anna Waleczek, Oliwia Skucha, Jakub Rogoża, Krzysztof Emerling, Szymon Duda'
release = '1.0.0'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx.ext.autodoc',  # dla Pythona
    'sphinx_js'
]

js_source_path = '../../app/static'

templates_path = ['_templates']
exclude_patterns = []



# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_static_path = ['_static']
