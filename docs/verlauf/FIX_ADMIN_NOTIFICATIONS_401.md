# Fix: /admin/notifications → 401 alle 60 Sekunden

## Das Problem
Im Log erschien regelmäßig (alle 30-60 Sek) ein 401 auf
/admin/notifications. Das Admin-Layout pollt diesen Endpoint für die
Badge-Zahlen im Menü.

## Ursache
Das Layout nutzte rohes fetch() mit dem Token direkt aus localStorage —
OHNE den Auto-Refresh, den unser api-Client hat. Wenn der Access-Token
nach 15 Min ablief, wurde er hier NICHT erneuert → 401 bei jedem Poll.
Zusätzlich pollte es auch, wenn gar kein Nutzer eingeloggt war.

## Fix
1. Rohes fetch() → api-Client (adminApi.notifications()).
   Der api-Client erneuert abgelaufene Token automatisch → kein 401 mehr
   für eingeloggte Admins.
2. Polling nur noch, wenn ein Nutzer eingeloggt ist (if (!user) return).
   Verhindert sinnlose 401-Aufrufe, wenn niemand eingeloggt ist.
3. Neuer adminApi.notifications() in api.ts.

## Hinweis
Falls der 401 weiterhin kcommt, obwohl eingeloggt: dann ist der User evtl.
nicht als Admin eingeloggt (dann ist der 401 korrekt) oder der Refresh-
Token ist auch abgelaufen (nach 7 Tagen) → neu einloggen.

## Keine Backend-Änderung, keine Migration.
