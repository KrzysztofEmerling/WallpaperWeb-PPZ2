import flask as f
from routes import routes
from flask_babel import Babel

app = f.Flask(__name__)
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_SUPPORTED_LOCALES'] = ['en', 'pl', 'ru']
app.config['BABEL_LANGUAGE_NAMES'] = { 'en': 'English', 'pl': 'Polski', 'ru': 'Russian'}
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

babel = Babel(app)
app.register_blueprint(routes)

def get_locale():
    """
    Pobiera preferowany język użytkownika zapisany w sesji.

    Returns:
        str: Kod języka (np. 'en' dla angielskiego), domyślnie 'en'.
    """
    lang = f.request.view_args.get('lang', None)
    if lang in app.config['BABEL_SUPPORTED_LOCALES']:
        return lang
    return app.config['BABEL_DEFAULT_LOCALE']

babel.init_app(app, locale_selector=get_locale)

if __name__ == "__main__":
    app.run(debug=True)
