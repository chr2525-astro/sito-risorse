# sito-risorse
sito risorse per astrofili

## Avvio in locale

Il catalogo viene letto da `data/risorse.json` con `fetch`, quindi apri il sito da un server HTTP locale (non direttamente come file).

```sh
python3 -m http.server 8000
```

Poi visita [http://localhost:8000](http://localhost:8000). Per aggiungere una risorsa, inserisci un elemento in `data/risorse.json` e usa una categoria esistente.
