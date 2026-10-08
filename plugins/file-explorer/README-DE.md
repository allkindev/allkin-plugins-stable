# Datei-Explorer

Die Dateien der Agenten in Allkin durchsuchen und verwalten.

## Tab „Dateien“ eines Agenten

Die Ordner-Schaltfläche in der Zeile eines Agenten öffnet seinen Bereich `data/`:

- Navigation durch Ordner (eine Zeile „Übergeordneter Ordner“, um nach oben zu gehen); Sortieren
  nach Name, Größe oder Datum (Spaltenköpfe; auf dem Telefon eine Schaltfläche „Sortieren“);
- **alles geschieht über den Kopf der Seite**, mit Symbol-Schaltflächen: suchen (der Namensfilter
  belegt nur eine Zeile, wenn du ihn öffnest), Dateien hochladen, neuer Ordner, neue Datei,
  Auswahl – das ⋮-Menü von Allkin hat hier nichts anzubieten;
- **ein Symbol pro Typ**: Ordner, Bild, PDF, Archiv, Skript, Code, Daten, Text… der Papierkorb und
  der Ordner `Upload` haben ihr eigenes;
- eine neu angelegte Datei öffnet sich sofort;
- **Hochladen** von Dateien und ganzen Ordnern per Drag and Drop, mit Fortschritt – oder über die
  Dateiauswahl des Systems (Schaltfläche „Hochladen“ im Kopf), der einzige Weg auf dem Telefon;
- **Kontextmenü** (Rechtsklick, langes Drücken oder die Schaltfläche ⋯ jeder Zeile): öffnen,
  herunterladen, auswählen, kopieren, ausschneiden, einfügen, umbenennen, archivieren, entpacken,
  neue Datei, neuer Ordner, hochladen, löschen;
- **Mehrfachauswahl**: Schaltfläche „Auswahl“ im Kopf oder „Auswählen“ auf einem Element. Dann
  erscheint eine Leiste mit Alle / Herunterladen / Verschieben / Löschen / Fertig – auf dem
  Telefon am unteren Bildschirmrand;
- **Papierkorb**: „Papierkorb leeren“ im Kontextmenü, wenn du darin bist;
- alle Bestätigungen und Eingaben laufen über die Fenster von Allkin, und jede Aktion antwortet
  mit einer Blase;
- zip/tar-**Archive** und Herunterladen eines Ordners als zip;
- **Ausführen von `.sh`-Skripten**, nachdem ihr Inhalt gelesen wurde, mit der Ausgabe live;
- **Papierkorb**: Gelöschtes wandert nach `Trash/`, das sich separat leeren lässt.

Mit dem Tool *Bildeditor* bietet das Kontextmenü eines Bildes **Bild bearbeiten** an.

Ein Klick auf eine Datei öffnet sie im Tool *Texteditor*, wenn es installiert ist, und lädt sie
sonst herunter.

## Freigegebener Ordner

In der Tool-Liste des Allkin-Menüs öffnet **Freigegebener Ordner** `~/.allkin/share`, gemeinsam
für alle Agenten und alle Tools: Alle lesen, schreiben, ergänzen und löschen dort. Dieselbe Seite
wie die Dateien eines Agenten, ohne Ausführen von Skripten. Ein Ordner mit dem Namen eines
installierten Tools gehört diesem: Sein Inhalt kann sich ändern, der Ordner selbst bleibt.
Kopieren oder Ausschneiden in den Dateien eines Agenten und Einfügen im freigegebenen Ordner (oder
umgekehrt) wechselt von einem zum anderen.

## Explorer von `~/.allkin`

Von der Startseite aus ein **schreibgeschützter** Gang durch den Installationsordner von Allkin:
Agenten, Sitzungen, Sicherungen. Geheimnisse sind dort nicht lesbar. Eine Datei öffnet sich in
einem **Betrachter**-Tab auf blauem Grund: Rohtext ohne Färbung oder Layout, ein Bild, ein PDF
oder der Inhalt eines Archivs (zip, tar) ohne es zu entpacken; andere Arten werden heruntergeladen.

Rechtsklick auf ein Element: Öffnen, Herunterladen, Pfad kopieren.

## Ohne dieses Tool

Kein Tab Dateien und kein Explorer mehr: Die Ordner-Schaltfläche der Agenten und die Schaltfläche
„Explorer“ der Startseite verschwinden. Die Agenten selbst behalten den Zugriff auf ihre Dateien
gemäß ihren Rechten.

## Angefordertes Recht

- **Oberfläche von Allkin** – das Tool läuft in der Seite von Allkin, mit deiner Sitzung.
