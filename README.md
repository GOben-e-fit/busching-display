# Busching Display

Die Anzeige liest alle 15 Sekunden den öffentlichen, ausschließlich lesenden
Endpunkt `https://inventur-pwa.vercel.app/api/display-status`.
Einstellungen werden unter `https://inventur-pwa.vercel.app/display-control`
mit dem vorhandenen Inventur-Zugang gespeichert. `control.html` leitet dorthin.
Es gibt keine GitHub-Zugangsdaten im Browser und keine konkurrierenden
GitHub-Workflows zum Schreiben des Status.

`overrideUntil` befristet einen manuellen Status. Danach gelten die regulären
Öffnungszeiten in Europe/Berlin, und temporäre Texte verschwinden. Ohne Frist
berechnet `autoScheduleEnabled` den Status anhand der Öffnungszeiten; bei
ausgeschalteter Automatik bleibt die manuelle Einstellung bestehen.

Bei Netzfehlern bleibt der letzte gültige Status im Browser erhalten; seine
Frist wird weiterhin ausgewertet. Ohne gespeicherten Status dient `status.json`
einmalig als Startreserve. Diese Datei ist kein zweiter Steuerungskanal.
Das Display lädt die Seite alle fünf Minuten neu (Samsung Tizen).

Prüfung: `node --test tests/display.test.cjs`.
Bei einer Rücknahme muss die vorangehende PWA-Version und die passende
Display-Version gemeinsam berücksichtigt werden. Aktuelle Display-Einstellungen
und Auditdaten dürfen dabei nicht überschrieben werden.
