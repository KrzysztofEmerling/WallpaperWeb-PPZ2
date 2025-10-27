# WallpaperWeb-PPZ2
Sklonowanie repozytorium:
~~~
git clone https://github.com/KrzysztofEmerling/WallpaperWeb-PPZ2
~~~

utworzenie flaskEnv z pliku requirements.txt:
~~~
python3 -m venv flaskEnv
./flaskEnv/bin/activate           (Unix)
flaskEnv\Scripts\activate         (Windows)
source flaskEnv/bin/activate      (MacOS)
pip install -r requirements.txt
~~~

Uruchomienie aplikacji:
~~~
python3 ./app/app.py    (Unix)
python app\app.py       (Windows)
~~~

## Opis Projektu
Projekt WallpaperWeb umożliwia użytkownikom interaktywne generowanie tapet. Aplikacja będzie dostępna w kilku językach i przyjazna dla użytkownika.

### Wymagania Niefunkcjonalne
Interfejs Użytkownika: Intuicyjny i responsywny.
Wydajność: Szybkie ładowanie strony (< 1.5 sekundy).

### Wymagania Bezpieczeństwa
Kompletna walidacja plików przesyłanych na aplikację.

### Technologie
Backend: Python, Flask, JavaScript
Frontend: HTML, CSS, Bootstrap

### Struktura Aplikacji
~~~
/project 
├── /app
│   ├── /static
│   │   ├── style.css
│   │   └── script.js
│   ├── /templates
│   │   └── index.html
│   ├── /translations
│   │   ├── /pl
│   │   │   └── /LC_MESSAGES
│   │   │   	├── messages.mo
│   │   │   	└── messages.po
│   │   └── /ru
│   │   	└── /LC_MESSAGES
│   │   		├── messages.mo
│   │   		└── messages.po
│   ├── routes.py
│   ├── app.py
│   ├── babel.cfg
│   └── messages.pot
└── requirements.txt
~~~

### Harmonogram
Dostępny na stronie: https://github.com/users/KrzysztofEmerling/projects/6

### Zespół Projektowy:
Agnieszka Głowacka,
Anastasiya Dorosh,
Martyna Trębacz,
Anna Waleczek,
Oliwia Skucha,
Jakub Rogoża,
Krzysztof Emerling,
Szymon Duda

