import flask as f
from routes import routes

app = f.Flask(__name__)
app.register_blueprint(routes)

if __name__ == "__main__":
    app.run(debug=True)
