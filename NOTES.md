# Użycie AI:
- Aplikacja została stworzona z pomocą claude.ai.
- Poprosiłem claude o przeanalizowanie zadania rekrutacyjnego i wstępne podzielenie go na taski
- Przejrzałem przygotowany przez claude plan i na tym etapie podjąłem decyzje większego formatu (brak użycia materiala, pure signal store, framework agnostic domain contract, planowanie aplikacji w sposób możliwy do skalowania).
- W następnej kolejności zaplanowałem architekturę plików i poprosiłem claude o weryfikację - ustąpiłem w wielu aspektach, jak struktura features/orders/feature, która wydała mi się nieestetyczna czy osobne pliki dla kalkulacji profitu i agregacji - zwyczajnie
ustąpiłem pod wpływem przytoczonych źródeł
- Większość pracy nad aplikacją wyglądała tak, że realizowałem dany krok pisząc własny kod (wyjątki poniżej), następnie prosiłem claude o review - kiedy proponował bardziej optymalne rozwiązanie, używałem go tylko pod warunkiem pełnego zrozumienia. Każdy task przechodził review przynajmniej dwukrotnie.
- Websocket został napisany z dużą pomocą AI - potrzebowałem wstępnego szablonu na którym mogę operować, nigdy nie pisałem wss od zera
- Z powodu braku czasu claude był odpowiedzialny również za stylowanie i testy (jednakowoż brałem czynny udział w planowaniu testów)


# Co mógłbym poprawić przy większej ilości czasu?
- Przygotowałbym NOTES.md bardziej szczegółowo i rzetelnie
- Można dołożyć ws status
- runtime schema validation
- edit mode - check multiple to remove
- confirm dialog przy usunięciu zlecenia
- ikonka dodania w danym rzędzie - pozwalałaby na autofill symbolu
- zlecenia planowane - sprzedaj po osiągnięciu ceny albo z danym offsetem