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

# Hello! If You have problems with sphinx_js on windows (node.cmd not found) it
# probably means You have a newer version of node that does not come with 
# node.cmd file. As of now, Sphinx is outdated and doesn't know this. In this
# case you have to create node.cmd by yourself and add it to path - SD
extensions = [
    'sphinx.ext.autodoc',  # for python
    'sphinx_js',
]

latex_documents = [
    ('index',
     'wallpaperweb.tex',
     'Dokumentacja projektu WallpaperWeb',
     r'Agnieszka Głowacka \\ Anastasiya Dorosh \\ Martyna Trębacz \\ Anna Waleczek \\ Oliwia Skucha \\ Jakub Rogoża \\ Krzysztof Emerling \\ Szymon Duda',
     'manual'),
]


latex_engine = 'pdflatex'
js_source_path = '../../app/static'

templates_path = ['_templates']
exclude_patterns = []



# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_static_path = ['_static']
