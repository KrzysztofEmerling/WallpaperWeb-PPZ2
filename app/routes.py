import flask as f
from flask_babel import gettext as _

routes = f.Blueprint('routes', __name__)

@routes.route('/', defaults={'lang': None})
@routes.route('/<lang>')
def index(lang):
    lang = f.request.view_args.get(lang, f.current_app.config['BABEL_DEFAULT_LOCALE'])
    if lang not in f.current_app.config['BABEL_SUPPORTED_LOCALES']:
        return f.redirect(f.url_for('routes.index', lang=f.current_app.config['BABEL_DEFAULT_LOCALE']))
    return f.render_template('index.html', lang=lang)

@routes.route('/change_lang/<new_lang>')
def change_lang(new_lang):
    if new_lang not in f.current_app.config['BABEL_SUPPORTED_LOCALES']:
        new_lang = f.current_app.config['BABEL_DEFAULT_LOCALE']
    return f.redirect(f.url_for('routes.index', lang=new_lang))