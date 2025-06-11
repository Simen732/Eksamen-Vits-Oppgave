# Fox Voting App 🦊

En fullstack webapplikasjon for å stemme på søte revbilder! Brukere kan sammenligne to tilfeldige revbilder og stemme på favorittreven sin. Applikasjonen støtter både registrerte og anonyme brukere, og tilbyr sanntidsoppdateringer av stemmeresultater.

## 📋 Prosjektstruktur

```
c:\Skole\Finder\
├── models/
│   ├── User.js          # Brukermodell med autentisering
│   └── Fox.js           # Revmodell for stemmedata
├── routes/
│   ├── auth.js          # Autentiseringsruter (login/register)
│   └── vote.js          # Stemmeruter og API
├── middleware/
│   └── auth.js          # JWT-autentisering middleware
├── public/
│   └── js/
│       └── voting.js    # Frontend stemmelogikk og Socket.IO
├── views/               # EJS-templates
├── server.js           # Hovedserver med Express og Socket.IO
└── package.json        # Prosjektavhengigheter
```

## 🚀 Hovedfunksjoner

### Stemmelogikk
- Sammenligning av to tilfeldige revbilder fra randomfox.ca API
- Støtte for både registrerte og anonyme stemmer
- Sanntidsoppdateringer via Socket.IO
- Automatisk lasting av nye revpar etter stemmegivning

### Brukerautentisering
- Registrering med brukernavn, e-post og passord
- Sikker innlogging med JWT-tokens
- Passordhashing med Argon2
- Profilstyring og stemmehistorikk

### Sanntidsfunksjoner
- Live oppdateringer av stemmetall
- Popup-meldinger for populære rever
- WebSocket-basert kommunikasjon

## 🛠️ Teknologier

### Backend
- **Node.js** med Express.js
- **MongoDB** med Mongoose ODM
- **Socket.IO** for sanntidskommunikasjon
- **JWT** for autentisering
- **Argon2** for passordhashing

### Frontend
- **EJS** templating engine
- **Vanilla JavaScript** for stemmelogikk
- **Socket.IO Client** for sanntidsoppdateringer
- **CSS** for styling og animasjoner

### Tredjepartstjenester
- **randomfox.ca API** for revbilder

## 📦 Installasjon og oppsett

### Forutsetninger
- Node.js (versjon 14+)
- MongoDB (lokal eller cloud)
- Git

### Trinn-for-trinn setup

1. **Klon prosjektet**
```bash
git clone <repository-url>
cd Skole/Finder
```

2. **Installer avhengigheter**
```bash
npm install
```

3. **Opprett miljøvariabler**
Opprett en `.env` fil i rotmappen:
```env
JWT_SECRET=din_hemmelige_jwt_nøkkel_her
MONGODB_URI=mongodb://localhost:27017/fox-voting
PORT=3000
```

4. **Start MongoDB**
Sørg for at MongoDB kjører lokalt eller konfigurer cloud-tilkobling.

5. **Start applikasjonen**
```bash
# Utviklingsmodus med nodemon
npm run dev

# Produksjonsmodus
npm start
```

6. **Åpne i nettleser**
Gå til `http://localhost:3000`

## 🔧 API-endepunkter

### Stemme-API (`/vote`)
- `GET /vote/random-foxes` - Hent to tilfeldige revbilder
- `POST /vote/vote/:foxNumber` - Stem på en rev
- `GET /vote/most-popular` - Hent mest populære rev

### Autentisering (`/auth`)
- `GET /auth/register` - Registreringsside
- `POST /auth/register` - Opprett ny bruker
- `GET /auth/login` - Innloggingsside
- `POST /auth/login` - Logg inn bruker
- `POST /auth/logout` - Logg ut bruker

## 🔄 Dataflyt

1. **Stemmegivning**:
   - Frontend henter to tilfeldige rever fra `/vote/random-foxes`
   - Bruker klikker på ønsket rev
   - POST-request til `/vote/vote/:foxNumber`
   - Backend oppdaterer database og sender Socket.IO-event
   - Alle tilkoblede klienter får sanntidsoppdatering

2. **Autentisering**:
   - Bruker registrerer/logger inn via `/auth` ruter
   - JWT-token lagres som httpOnly cookie
   - Middleware validerer token på beskyttede ruter

## ⚠️ Potensielle sikkerhetsrisikoer

### 1. Manglende ratebegrensning på stemmer
**Problem**: Ingen begrensning på hvor mange stemmer en bruker kan avgi i løpet av kort tid.
**Risiko**: Brukere kan spamme stemmer og manipulere resultater.
**Løsning**: Implementer rate limiting på stemmeendepunktet, for eksempel maks 10 stemmer per minutt per IP-adresse.

### 2. Utilstrekkelig input-validering på Fox API
**Problem**: Applikasjonen stoler blindt på data fra randomfox.ca API uten grundig validering.
**Risiko**: Hvis API-en returnerer uventede data eller blir kompromittert, kan det føre til XSS-angrep eller andre sikkerhetsproblemer.
**Løsning**: Implementer streng validering av URL-formater og bildetype før lagring i database.

### 3. Cookies uten HTTPS i produksjon
**Problem**: JWT-cookies er satt til `secure: false`, som tillater overføring over usikre HTTP-forbindelser.
**Risiko**: Tokens kan bli fanget opp via man-in-the-middle angrep på usikre nettverk.
**Løsning**: Sett `secure: true` for cookies i produksjonsmiljø og sørg for HTTPS-sertifikat.

## 🧪 Testing

For å teste applikasjonen:

1. **Registrer en ny bruker** og verifiser at autentisering fungerer
2. **Test stemmegivning** både som registrert og anonym bruker
3. **Sjekk sanntidsoppdateringer** ved å åpne flere nettleserfaner
4. **Test feilhåndtering** ved å blokkere API-kall i utviklerverktøy

## 🤝 Bidrag

Bidrag er velkommen! Vennligst:
1. Fork prosjektet
2. Opprett en feature branch
3. Commit endringene dine
4. Push til branchen
5. Åpne en Pull Request

## 📄 Lisens

Dette prosjektet er en utdanningsoppgave. Kontakt prosjekteier for lisensdetaljer.

---

Utviklet som del av et webapplikasjonskurs 🎓
