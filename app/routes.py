import flask as f

routes = f.Blueprint('routes', __name__)

@routes.route('/')
def index():
    return f.render_template('index.html')
