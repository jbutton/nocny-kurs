# Nocny Kurs / Night Run — Game Design Document (v0.2)

> **Nazwa:** „Nocny Kurs” (PL) / „Night Run” (EN). Podwójne znaczenie: nocna jazda między miastami i nocny „kurs” cen.
> Logo: neonowy napis z księżycem i przerywaną linią drogi, zmienia się z językiem.
> Przeglądarkowa gra ekonomiczno-handlowa w gatunku "kup tanio, sprzedaj drogo"
> (jak klasyczne Drug Wars). Własny świat, nazwa, postacie i grafika — inspirujemy się gatunkiem,
> nie kopiujemy żadnej konkretnej gry.

---

## 1. Wizja

- **Gatunek:** turowy symulator handlu z elementami ryzyka i fabuły.
- **Klimat:** współczesna Polska, czarny humor, satyra na realia (media, policja, influencerzy).
- **Platforma:** przeglądarka, **mobile-first** (gra się na telefonie w 5–10 minut), działa też na desktopie.
- **Języki:** PL i EN, przełączane w dowolnym momencie gry, także w trakcie rozgrywki.
- **Grupa docelowa:** 18+. Gra to fikcja i nie gloryfikuje: konsekwencje (więzienie, uzależnienie, utrata wszystkiego) są częścią mechaniki.
- **Wyróżniki względem konkurencji (np. drugwars.online):**
  1. Interfejs w formie **smartfona bohatera**, a nie tabelka.
  2. Polskie miasta, polskie realia, humor.
  3. Głębsza mechanika: heat, kontakty, pranie pieniędzy, ekipa, wydarzenia z wyborami.
  4. **Medyczna marihuana na receptę** jako polska „szara strefa” (§3a). Tego nie ma żadna inna gra z gatunku.
  5. **Czytelny, przyjazny UX** (§10a): po minucie gry wiadomo, o co chodzi i co robić.
  6. Multiplayer **dopiero po** dopracowaniu wersji dla jednego gracza (§11).

---

## 2. Główna pętla gry

```
START: 2 000 zł gotówki, 5 000 zł długu u lichwiarza, plecak (pojemność 100), Warszawa, dzień 1/30
   │
   ▼
[Dzień] → sprawdź rynek → kup / sprzedaj → czat (zlecenia, cynki) → bank / lichwiarz / sklep
   │
   ▼
[Podróż] → wybór miasta i środka transportu → losowe zdarzenie na trasie (policja, okazja, napad)
   │
   ▼
[Nowy dzień] → odsetki od długu, zmiana cen, newsy, zmiana heatu
   │
   ▼
Dzień 30 (lub game over) → ekran końcowy, wynik, ranking, udostępnienie
```

**Wynik końcowy** = gotówka + bank + wartość przykrywek − dług.
Towar niesprzedany na koniec jest wart 0, co zmusza do upłynnienia towaru przed końcem.

---

## 3. Towary

Ceny w zł za jednostkę (fikcyjne, zbalansowane pod rozgrywkę, nie odzwierciedlają rzeczywistości).
Każdy towar zajmuje 1 miejsce w ekwipunku, chyba że podano inaczej.

| ID | Towar (PL) | EN | Min | Max | Zmienność | Uwagi |
|---|---|---|---|---|---|---|
| weed | Marihuana | Weed | 20 | 80 | niska | Stabilny „chleb powszedni”. |
| hash | Haszysz | Hash | 40 | 140 | niska | |
| shrooms | Grzybki | Shrooms | 50 | 200 | średnia | Sezonowe: tańsze jesienią. |
| speed | Amfetamina | Speed | 30 | 150 | średnia | Tania na Śląsku i w Łodzi. |
| mefa | Mefedron | Mephedrone | 40 | 220 | **wysoka** | „Towar 2026”, częste newsy. |
| ecstasy | Ecstasy / MDMA | Ecstasy | 30 | 160 | średnia | Drożeje w weekendy i podczas festiwali. |
| lsd | LSD | LSD | 60 | 300 | średnia | Zajmuje 0,1 miejsca (znaczki). |
| ketamine | Ketamina | Ketamine | 80 | 400 | wysoka | Popularna w klubach. |
| dopalacze | Dopalacze | Legal highs | 10 | 120 | **bardzo wysoka** | Ryzyko eventu „zatrucia”, które zwiększa heat. |
| coke | Kokaina | Cocaine | 250 | 900 | średnia | Tania w portach (Gdańsk, Szczecin). |
| heroin | Heroina | Heroin | 400 | 1 400 | wysoka | Najwyższe ryzyko i największy zysk. |

> Listę łatwo zmienić, bo towary są w pliku danych (JSON), a nie w kodzie.

---

## 3a. Medyczna marihuana: mechanika „Recepta”

### Jak to wygląda w rzeczywistości (research, listopad 2026)
- Susz konopny jest legalny w aptece **na receptę**. Nie jest refundowany, pacjent płaci 100%.
- **Ceny w aptekach:** od ok. 19 do 84 zł/g, typowo 45–70 zł/g. Ten sam produkt potrafi kosztować w różnych aptekach nawet 3,2× więcej. Dostępność jest dziurawa: dany susz ma od 1% do 29% aptek.
- **Ceny na czarnym rynku:** brak wiarygodnych aktualnych danych. Starsze dane EUDA dla Polski to ok. 4–13 €/g, a jedno nieudokumentowane źródło podaje ok. 46 zł/g. Wniosek: **ceny apteczne i uliczne są podobne**. Apteka bywa tańsza od ulicy, a czasem droższa.
- **Recepta:** wizyta w prywatnej klinice ok. 250 zł, kontrolna ok. 150 zł. Od 7.11.2024 pierwsza recepta wymaga **wizyty stacjonarnej**. Teleporada wystarcza, jeśli od ostatniego badania minęły najwyżej 3 miesiące. Recepta jest ważna 30 dni, na określoną ilość.
- Pacjent może legalnie mieć przy sobie susz z apteki (w oryginalnym opakowaniu, z receptą). **Odsprzedaż jest nielegalna**: to nadal obrót.

### Jak to przenosimy do gry
To polska „szara strefa”: legalne, półlegalne i nielegalne w jednym.

**Nowe miejsca w mieście:**
- **Klinika konopna** (tylko w większych miastach): wizyta za 250 zł daje **Receptę** na N gramów (np. 30). Pierwsza wizyta wymaga obecności w mieście z kliniką. Przedłużenie przez aplikację „Teleporada” kosztuje 150 zł i działa z każdego miejsca, ale tylko wtedy, gdy pierwsza wizyta była niedawno (w grze: w ciągu 10 dni).
- **Apteka:** nowy towar **„Susz apteczny”**. Kupisz go tylko z receptą i najwyżej tyle, na ile jest wystawiona. Cena 20–85 zł/g, mocno różna w każdym mieście. Czasem „brak na stanie”.

**Co daje recepta:**
- Podczas kontroli policji marihuana **do limitu z recepty, kupiona w aptece**, jest legalna: nie ma konfiskaty ani wzrostu heatu.
- **Pokusa (główny haczyk):** susz apteczny ma znaną jakość, więc na ulicy klienci płacą za niego **+30–50%** więcej niż za zwykłą marihuanę („apteczny, sprawdzony”). Możesz kupić legalnie w aptece i sprzedać nielegalnie z zyskiem, ale wtedy przy kontroli recepta cię nie chroni.
- **Blef:** wieziesz uliczną marihuanę i machasz receptą. Jeśli towaru jest więcej niż na recepcie albo nie jest w aptecznym opakowaniu, policja to wykrywa i kara jest **większa** niż bez recepty.

**Kontakt fabularny: „Doktor Marek”:** lekarz, który „łatwo wypisuje”. Daje recepty na większe ilości bez wizyty, ale każda taka recepta zwiększa szansę na event „Afera receptowa”.

**Eventy związane z receptą:**
- „Ministerstwo zaostrza zasady recept”: teleporady wyłączone na 5 dni.
- „Brak suszu w aptekach”: apteki puste, cena uliczna marihuany ×1.5.
- „Afera receptowa: kontrole w klinikach”: recepty od Doktora Marka unieważnione, policja sprawdza recepty dokładniej.
- „Nowa dostawa z Kanady”: susz apteczny −40% we wszystkich aptekach.

**Uproszczenia na rzecz czytelności:** jedna recepta naraz, jeden rodzaj suszu aptecznego, a limit i ważność są zawsze widoczne w aplikacji „Recepta” w telefonie.

**Ton:** neutralny i satyryczny. Gra nie uczy, jak obchodzić przepisy. Pokazuje absurdy szarej strefy i konsekwencje.

---

## 4. Miasta

Podróż = 1 dzień (wyjątki opisane przy transporcie). Każde miasto ma modyfikatory:

| Miasto | Tanie | Drogie | Policja | Cecha specjalna |
|---|---|---|---|---|
| Warszawa | — | coke, ketamine | wysoka | Największy rynek, najlepsze ceny sprzedaży, siedziba lichwiarza i banku. |
| Kraków | — | ecstasy, lsd | średnia | Turyści: ceny skaczą w weekendy. |
| Gdańsk | coke | — | średnia | Port: okazje hurtowe. Latem eventy w Sopocie. |
| Szczecin | coke, heroin | — | niska | Port, blisko granicy. Dostęp do przemytu. |
| Wrocław | ecstasy | speed | średnia | Festiwale. |
| Poznań | weed | coke | niska | Stabilne ceny. |
| Łódź | speed, mefa | — | niska | Tania produkcja, jakość losowa. |
| Katowice | speed | weed | średnia | Śląsk: duży popyt. |
| Lublin | heroin | lsd | niska | Wschodnia trasa. |
| Białystok | hash, dopalacze | — | wysoka | Granica: Straż Graniczna zwiększa ryzyko kontroli. |
| Zakopane | — | wszystko +30% | niska | Tylko zimą i latem. Turyści płacą więcej. |

---

## 5. Ekonomia (wzory)

### 5.1 Cena towaru
```
cena = bazowa × mod_miasta × trend × mod_eventu × szum
bazowa     = (min + max) / 2
mod_miasta = 0.7 (tanie) / 1.0 / 1.3 (drogie)
trend      = błądzenie losowe z powrotem do średniej: trend += (1 - trend) * 0.2 + N(0, zmienność)
mod_eventu = np. 0.3 (zalew rynku) albo 3.0 (susza po nalocie), trwa 1–3 dni
szum       = U(0.9, 1.1)
cena przycinana do [min × 0.3, max × 3]
```

### 5.2 Wpływ gracza na rynek
- Sprzedaż dużej ilości w jednym mieście obniża tam cenę o `ilość / głębokość_rynku` (np. 0,5% za sztukę).
- Efekt wygasa w ciągu ok. 3 dni. Nie da się bez końca dociskać jednego rynku, więc trzeba podróżować.
- W multiplayerze ten sam mechanizm działa dla wszystkich graczy jednocześnie (patrz §11).

### 5.2a Brak pieniędzy: gapa, pożyczka, windykacja, bankructwo
- **Jazda na gapę:** zawsze możliwa (a bez pieniędzy na bilet jedyna opcja). 30% szans na kanara, mandat 150 zł. Bez gotówki Zbychu płaci mandat i dopisuje go do długu.
- **Pożyczka od Zbycha** (Portfel → Pożycz): limit długu = max(3 × dług startowy, 2 × majątek). Domyślna kwota 0, żeby nie pożyczyć za dużo jednym kliknięciem.
- **Windykacja:** dług > 2 × startowy. Najpierw ostrzeżenie na czacie, potem co 3 dni „chłopcy Zbycha” zabierają 30% gotówki (na poczet długu), a gdy gotówki brak, połowę towaru (wycenioną po połowie ceny).
- **Bankructwo:** gotówka + bank poniżej ceny najtańszego towaru, pusty plecak i brak limitu pożyczki oznaczają koniec gry z ekranem „Bankrut” (bez wpisu do rankingu).

### 5.3 Dług i bank
- **Lichwiarz** („Wujek Zbychu”): +7% odsetek dziennie. Możesz pożyczyć więcej (maksymalnie 3× twój majątek).
  - Dług > 15 000 zł albo brak spłaty przez 7 dni: SMS-y z pogróżkami, potem wizyta „windykatorów” (utrata zdrowia lub gotówki).
- **Bank:** +1% dziennie. Pieniądze w banku są bezpieczne przy napadzie i aresztowaniu, ale wpłata gotówki powyżej 10 000 zł zwiększa heat (zgłoszenie do GIIF). Można to obejść przez przykrywki (§8).
- **Krypto (od dnia 10):** portfel z jednym fikcyjnym coinem. Duża zmienność, zerowy heat przy wpłacie, 2% prowizji.

---

## 6. Heat (zainteresowanie policji)

Skala 0–100, pokazywana jako **poziom poszukiwania: 0–5 gwiazdek** (co 20 punktów jedna) z opisem słownym. Na Mapie poziom policji w mieście to 1–3 gwiazdki.

| Co podnosi | Ile |
|---|---|
| Duża transakcja (> 50 sztuk) | +3…+10 |
| Wpłata gotówki do banku > 10k | +10 |
| Sprzedaż dopalaczy z eventem „zatrucie” | +15 |
| Ucieczka przed policją | +10 |
| Przekupstwo, które się nie udało | +20 |

| Co obniża | Ile |
|---|---|
| Dzień bez handlu („przyczajenie”) | −10 |
| Każdy dzień (naturalny spadek) | −2 |
| Kontakt: znajomy policjant | −20 jednorazowo |
| Pranie pieniędzy przez przykrywkę | brak wzrostu |

**Skutki:** szansa na kontrolę w podróży = `5% + heat × 0.5%`. Przy heat > 80 możliwy nalot (utrata części towaru i gotówki).

---

## 7. Spotkania i wydarzenia

### 7.1 Kontrola policji (w podróży)
Wybory gracza:
- **Uciekaj:** szansa zależy od transportu. Sukces daje heat +10, porażka oznacza zatrzymanie.
- **Przekup:** koszt zależy od wartości towaru. Szansa zależy od heatu i kontaktów.
- **Wyrzuć część towaru:** pewne, tracisz połowę nielegalnego towaru, bez kary.
- **Blefuj:** mała szansa na sukces, która rośnie, jeśli masz przykrywkę („jestem dostawcą kebabu”).
- **Zatrzymanie:** konfiskata połowy nielegalnego towaru i grzywna 20% gotówki (areszt: później).

### 7.2 Wydarzenia rynkowe (newsy)
Przykłady. Każde ma tekst PL i EN oraz efekt:
- „Policja rozbiła laboratorium pod Łodzią”: mefa ×3 w całej Polsce przez 2 dni.
- „Statek z Ameryki Płd. zatrzymany w Gdyni”: coke ×2.5.
- „Zalew tanich dopalaczy z Chin”: dopalacze ×0.3.
- „Festiwal w Gdyni / Wrocławiu”: ecstasy i lsd ×2 w danym mieście.
- „Raper wspomniał o ketaminie w nowym numerze”: ketamine ×1.8.
- „Nowa ustawa: zaostrzenie kar”: heat ×1.5 przez 3 dni.

### 7.3 Wydarzenia osobiste (scenki z wyborem)
- Ktoś proponuje towar „po kosztach”. To może być okazja, podróbka albo prowokacja policyjna.
- Klient prosi o kredyt.
- Znajomy oferuje „przechowanie” towaru.
- Twój kurier zniknął z towarem. Szukasz go czy odpuszczasz?
- Spotkanie na trasie: napad. Wybory: oddaj część towaru, walcz (ryzyko utraty zdrowia), uciekaj.

### 7.4 Zdrowie
Skala 0–100. Spada przy napadach i windykacji. Leczenie u „prywatnego lekarza” za gotówkę. 0 oznacza koniec gry.

---

## 8. Progresja

### 8.1 Sklep: transport (pojemność i ucieczka)
Kupowany w zakładce **Sklep**, tylko „w górę” (każdy następny ma więcej miejsca).

| Transport | Cena | Miejsce | Ucieczka | Uwagi |
|---|---|---|---|---|
| Plecak | start | 100 | 50% | |
| Duży plecak | 1 500 zł | 150 | 50% | |
| Skuter | 8 000 zł | 200 | 65% | |
| Auto z bagażnikiem | 25 000 zł | 350 | 55% | |
| Dostawczak | 70 000 zł | 700 | 35% | Kontrole policji ×1,25. |
| Kurier / dron (później) | — | — | — | Wysyłka bez podróżowania, z ryzykiem utraty. |

**Koszt podróży zależy od odległości** (współrzędne miast, odległość w linii prostej × 1,2 ≈ droga):
- pociąg (plecak): bilet = 15 zł + 0,20 zł/km, np. Katowice → Kraków (85 km) 32 zł, Gdańsk → Kraków (580 km) 131 zł;
- własny pojazd: paliwo = km × spalanie × 6,5 zł/l. Skuter 3 l/100 km, auto 7 l/100 km, dostawczak 11 l/100 km (Warszawa → Kraków: 59 / 139 / 218 zł, bilet 76 zł);
- własnym pojazdem nie da się jechać na gapę; brak kasy na paliwo → „Pożycz brakującą kwotę od Zbycha i jedź” albo sprzedaż towaru/pojazdu;
- pojazd można sprzedać za 50% ceny (powrót do plecaka 100), tylko gdy towar mieści się w plecaku;
- Mapa sortuje miasta od najbliższego i pokazuje koszt oraz odległość.

### 8.1a Sklep: ochrona i napady
**Napad na trasie** (ok. 7% szans przy podróży z towarem, jeśli nie było kontroli; × mnożnik poziomu trudności: łatwy 0,5, normalny 1, trudny 1,5). Wybory:
- **Oddaj część towaru:** pewne, tracisz ćwierć każdego towaru.
- **Uciekaj:** szansa zależy od transportu. Porażka oznacza utratę połowy towaru.
- **Broń się** (tylko z ochroną): szansa zależy od broni. Porażka oznacza utratę połowy towaru i 20% gotówki.

| Ochrona | Cena | Obrona | Uwagi |
|---|---|---|---|
| Gaz pieprzowy | 300 zł | 40% | Legalny. |
| Kij bejsbolowy | 800 zł | 55% | Legalny. |
| Pistolet | 6 000 zł | 80% | Nielegalny: przy złapaniu przez policję konfiskata + 1 000 zł grzywny. |

Kupione przedmioty zostają (każdy kupuje się raz). Obrona = najlepszy przedmiot + 5% za każdy kolejny (max 90%). Po przegranym starciu napastnicy zabierają najlepszą broń.

### 8.2 Kontakty
Zdobywasz je przez zlecenia na czacie (np. „przywieź 20 g do Krakowa do piątku”). Przykłady:
- **Hurtownik:** −15% na wybrany towar w wybranym mieście.
- **Informator:** dzień wcześniej dostajesz cynk o nadchodzącym evencie rynkowym.
- **Znajomy gliniarz:** jednorazowe zbicie heatu, ostrzeżenie przed nalotem.
- **Prawnik:** krótszy areszt.

### 8.3 Przykrywki (pranie pieniędzy)
Kupujesz lokal, a on „pierze” X zł dziennie bez wzrostu heatu i daje mały dochód.
- Budka z kebabem (tania, pierze mało)
- Myjnia samochodowa
- Sklep z e-papierosami
- Klub nocny (droga, pierze dużo, ale zwiększa szansę eventów z policją)

### 8.4 Ekipa (od drugiej połowy gry)
Zatrudniasz dilerów w miastach. Sprzedają za ciebie (pasywny dochód), ale mogą wpaść albo cię okraść. Lojalność rośnie z wypłatą.

---

## 9. Cel gry, ranking i zakończenia

**Cel:** w wyznaczonym czasie (30 dni, na łatwym 45) zarobić jak najwięcej.
**Wynik = gotówka + bank − dług.** Niesprzedany towar jest wart 0. Cel jest pokazany graczowi na ekranie wyboru poziomu trudności.

**Ranking:**
- Po zakończeniu gry z wynikiem > 0 gracz wpisuje **nick** (zapamiętywany na kolejne gry) i zapisuje wynik.
- Osobny ranking dla każdego poziomu trudności, top 10. Przy każdym wpisie są nick, wynik, ranga i data. Wpis gracza jest podświetlony, z komunikatem „Zająłeś X. miejsce”.
- Ranking jest dostępny w każdej chwili przez przycisk 🏆 w pasku u góry.
- **MVP:** ranking lokalny, zapisany w przeglądarce.
- **Później:** ranking online, wspólny dla wszystkich graczy. Wymaga backendu i ochrony przed oszustwami: serwer odtwarza grę z seeda i listy ruchów (§14a) i dopiero wtedy przyjmuje wynik.

### Zakończenia

| Warunek | Zakończenie |
|---|---|
| Dzień 30, wynik > 0 | **Wyszedłeś na czysto.** Ranga zależy od wyniku (Płotka → Diler → Hurtownik → Boss → Baron). |
| Dzień 30, wynik ≤ 0 | **Zostałeś z długiem.** „Wujek Zbychu ma dla ciebie robotę…” |
| Zdrowie 0 | **Koniec.** |
| 3 zatrzymania | **Więzienie.** |
| Wynik > 1 mln zł przed dniem 30 + kupiony bilet | **Ucieczka za granicę** (bonus do wyniku). |

---

## 10. Interfejs: telefon bohatera

Główny ekran to smartfon. Na desktopie telefon jest na środku, a obok rozmyte tło miasta.

**Aplikacje:**
- **Rynek:** lista towarów: cena kupna i sprzedaży, strzałka trendu, mini-wykres z 7 dni, liczba sztuk w plecaku. Kupno i sprzedaż suwakiem.
- **Mapa:** mapa Polski z miastami, koszt podróży, ikonka ryzyka.
- **Czat:** wątki z kontaktami, lichwiarzem i „mamą” (humor), zlecenia, cynki.
- **Newsy:** feed w stylu serwisu społecznościowego, wydarzenia rynkowe i memy.
- **Portfel:** gotówka, bank, krypto, dług z licznikiem odsetek.
- **Ustawienia:** język PL/EN (przełączany od razu), dźwięk, motyw.

**Pasek statusu telefonu:** dzień X/30, gotówka, heat (syrena), zdrowie (bateria), miejsce w plecaku.

**Styl graficzny:** ciemny motyw, ale ciepły i przyjazny (nie horror ani „hakerski terminal”). Zaokrąglone kształty, czytelne ikony, ilustracje miast w stylu flat. Animacje przejść między aplikacjami. Powiadomienia wyskakują jak prawdziwe pushe.

**Aplikacja „Recepta”** (pojawia się dopiero po pierwszej wizycie w klinice): limit, zużycie i data ważności.

---

## 10a. Zasady UX: czytelnie i bez stresu

**Cel:** nowy gracz po **60 sekundach** wie, co robić, a po pierwszej grze rozumie wszystkie podstawy.

### Zasady ogólne
1. **Jedna główna akcja na ekranie.** Na Rynku to „kup/sprzedaj”, na Mapie „jedź”. Duże przyciski, łatwe do kliknięcia kciukiem.
2. **Ceny ocenione za gracza.** Przy każdej cenie jest kolor i etykieta względem średniej: 🟢 **tanio**, ⚪ normalnie, 🔴 **drogo**. Gracz nie musi pamiętać liczb.
3. **Zysk widoczny przed decyzją.** Przy sprzedaży widać „kupiłeś po 40, sprzedajesz po 65, **zysk +1 250 zł**”. Przy kupnie widać, ile zostanie gotówki i miejsca.
4. **Mało liczb naraz.** Na ekranie głównym są tylko: dzień, gotówka, dług, miejsce w plecaku. Reszta jest po kliknięciu.
5. **Prosty język.** Zamiast „heat 47” jest pasek „Policja się tobą interesuje 🚨🚨⚪⚪⚪” z podpowiedzią „Przyczaj się 1 dzień, żeby obniżyć”.
6. **Bez kar za pomyłki w interfejsie.** Ostatnią transakcję można cofnąć do końca dnia (bez zmiany dnia). Akcje nieodwracalne (podróż, wpłata do lichwiarza) mają potwierdzenie.
7. **Odkrywanie stopniowe.** Nowe funkcje (bank, recepta, przykrywki, ekipa) pojawiają się dopiero, kiedy mają sens, z krótkim wyjaśnieniem w czacie. Nie ma jednego ekranu z 20 opcjami na start.
8. **Zdarzenia losowe zawsze z jasnymi opcjami.** Maksymalnie 3–4 przyciski, każdy z opisem szans i skutków („Uciekaj: ~50% szans, jeśli się nie uda, stracisz towar”).
9. **Bez straszenia.** Grafika i teksty bez przemocy i krwi. Porażka jest opisana z humorem, a „Zagraj jeszcze raz” to jeden klik.

### Onboarding: pierwszy dzień z przewodnikiem
- W czacie odzywa się **mentor** (np. „Kuzyn Seba”) i prowadzi gracza przez kroki:
  1. „Zobacz, marihuana jest tu tania 🟢. Kup 10.”
  2. „Jedź do Krakowa, tam płacą więcej.”
  3. „Sprzedaj. Widzisz zysk? O to chodzi.”
  4. „Pamiętaj o długu u Wujka Zbycha. Rośnie codziennie.”
- Każdą podpowiedź można pominąć. Mentor co jakiś czas daje też wskazówki w trakcie gry („Masz pełny plecak, a w Gdańsku jest drogo 😉”).

### Poziomy trudności
- **Łatwy:** 45 dni, mniejszy dług, rzadsze kontrole, podpowiedzi mentora przez całą grę.
- **Normalny:** jak w §2.
- **Trudny:** 30 dni, większy dług, ostrzejsza policja, brak podpowiedzi. **Nie widać ceny zakupu ani wyliczonego zysku**: gracz musi sam pamiętać, po ile kupił.

### Dostępność
- Kolory zawsze z ikoną lub tekstem (nie tylko kolor), co pomaga osobom z daltonizmem.
- Duży, czytelny font. Tryb jasny i ciemny.
- Pełna obsługa klawiaturą na desktopie (skróty do kupna i sprzedaży, cyfry do wyboru miasta).

---

## 11. Multiplayer: PÓŹNIEJ (poza obecnym zakresem)

> Decyzja: najpierw dopracowana gra dla jednego gracza. Do multiplayera wracamy, gdy wszystko działa.
> Poniższe etapy to notatki na przyszłość. Jedyne, o czym pamiętamy już teraz, to założenia z §14a
> (logika oddzielona od UI, losowanie z seedem), żeby multiplayer dało się później dołożyć bez przepisywania gry.

### Etap 1: Wyzwanie dnia
- Każdego dnia jest jeden **seed**: wszyscy gracze mają te same ceny początkowe i te same eventy.
- Jedna próba dziennie liczy się do rankingu.
- Ekran końcowy z wynikiem do udostępnienia (tekst lub emoji, bez spoilerów), np.:
  `Nocny Kurs #127 💰 412 300 zł 🚨×2 🏙️ 14 podróży`
- Backend jest minimalny: zapis wyniku i ranking. Wynik weryfikuje serwer przez odtworzenie gry z seeda i listy ruchów (ochrona przed oszustami).

### Etap 2: Wspólny rynek (asynchroniczny)
- Sezon trwa np. tydzień. Wszyscy gracze w sezonie mają wspólne ceny.
- Sprzedaż innych graczy obniża ceny także u ciebie (§5.2).
- Ranking sezonu, gangi (gildie) z wynikiem zespołowym.

### Etap 3: Pokoje w czasie rzeczywistym (2–8 graczy)
- 30 tur, każda ok. 60 s (albo kończy się wcześniej, gdy wszyscy są gotowi).
- Wspólny rynek w pokoju.
- Interakcje PvP: **donos** (heat innego gracza +30, koszt i ryzyko ujawnienia), przejmowanie zleceń, sojusze i wspólny transport, handel między graczami.
- Technicznie: WebSockety, serwer autorytatywny.

---

## 12. Lokalizacja (PL / EN)

- Wszystkie teksty mają klucze w plikach `pl.json` i `en.json`. Nic nie jest wpisane na sztywno w kodzie.
- Przełączenie języka od razu odświeża cały interfejs, także w trakcie gry, bez restartu.
- Treść (nazwy towarów, eventy, dialogi) jest tłumaczona kreatywnie, nie dosłownie: polski slang ↔ angielski slang.
- Formaty: waluta zawsze zł (PLN) jako element klimatu, liczby formatowane według języka.

---

## 13. Zakres MVP (pierwsza grywalna wersja)

**Zawiera:**
- 8 towarów, 8 miast
- Rynek, mapa, portfel, prosty czat, newsy
- Dług, bank, heat, kontrole policji, ok. 15 eventów rynkowych, ok. 10 scenek z wyborem
- **Recepta: klinika, apteka, susz apteczny, ochrona przy kontroli** (§3a, bez Doktora Marka)
- 3 poziomy transportu
- Zakończenia z §9
- **Zasady UX z §10a: oceny cen, podgląd zysku, onboarding z mentorem, 3 poziomy trudności**
- PL/EN z przełączaniem w locie
- Lokalny ranking top 10 na każdy poziom trudności, z nickiem (§9)
- Automatyczny zapis gry w przeglądarce (localStorage) i przycisk „Nowa gra”

**Poza MVP:** kontakty (w tym Doktor Marek), przykrywki, ekipa, krypto, Zakopane, **cały multiplayer** (także wyzwanie dnia z rankingiem online), konta graczy.

---

## 14. Stack technologiczny

**Decyzja:** **Astro** + **Svelte 5** + pakiety **TanStack** (niezależne od frameworka).

| Warstwa | Wybór | Uwagi |
|---|---|---|
| Strona i build | **Astro** (statyczny output) | Strony: start, gra, ranking, „o grze”. Wbudowane i18n routing (`/pl`, `/en`) dla stron. W grze PL/EN przełącza się bez przeładowania. |
| Logika gry | **czysty TypeScript** (`src/game/`) | Bez żadnego frameworka: stan + akcje → nowy stan. Testowalna w Vitest, później ta sama na serwerze. |
| Stan UI | **@tanstack/store** | Pakiet niezależny od frameworka. Jeden store z całym stanem gry, subskrypcje do renderu i autozapisu. |
| UI gry (wyspa Astro) | **Svelte 5** | Kompiluje się do małego JS i dobrze integruje z Astro. TanStack Store ma adapter `@tanstack/svelte-store`. |
| Dane z serwera (później) | **@tanstack/svelte-query** | Ranking online i ewentualne konta, gdy dojdzie backend. |
| Backend (później) | **Astro API routes** (endpointy) + baza (np. SQLite/Turso) | Ranking online z weryfikacją wyniku przez odtworzenie gry. |
| Testy | Vitest (logika), Playwright (e2e) | |

> Routing robi Astro (TanStack Router/Start nie są potrzebne).

## 14a. Założenia techniczne (niezależne od frameworka)

- **Logika gry jako czysty moduł** (bez UI): stan + akcje → nowy stan. Pozwala to:
  - testować ekonomię automatycznie (symulacje tysięcy gier do balansu),
  - odtwarzać grę na serwerze z seeda i listy ruchów (antycheat),
  - użyć tej samej logiki w multiplayerze.
- **Deterministyczny generator losowy z seedem** (np. mulberry32). Nigdy `Math.random()` w logice.
- **Dane w plikach JSON:** towary, miasta, eventy, teksty. Balans zmienia się bez zmian w kodzie.

---

## 14a-bis. Balans (symulacja `npm run sim`, bot 2000 gier/poziom)
Po zmianie strat z „cały towar” na „połowa” i skalowaniu napadów poziomem trudności:

| Poziom | Wygrane (wynik > 0) | Bankructwa | Mediana wyniku |
|---|---|---|---|
| Łatwy | 97% (przed: 47%) | 0,6% (przed: 15,7%) | 119 748 zł |
| Normalny | 89% (przed: 30%) | 3,0% (przed: 23,0%) | 36 820 zł |
| Trudny | 47% (przed: 13%) | 10,3% (przed: 39,6%) | −14 284 zł |

## 14b. Hosting i SEO
- **Hosting:** GitHub Pages, za darmo, pod adresem `https://jbutton.github.io/nocny-kurs/`. Wdrażanie automatyczne przez GitHub Actions po każdym pushu na `main`.
- **Domena:** na razie darmowa subdomena `github.io`. Własną domenę (np. `nocnykurs.pl`) można podpiąć później bez zmian w kodzie, poza `site`/`base` w `astro.config.mjs`.
- **Ranking online (zrobione):** Cloudflare Worker `nocny-kurs-api` + baza D1 (darmowy plan), adres w zmiennej repozytorium `PUBLIC_API_URL`. Każdy ruch gracza trafia do dziennika (`src/game/replay.ts`); serwer odtwarza grę z seeda początkowego i dziennika tym samym silnikiem i sam liczy wynik. Odrzuca duplikaty (seed + poziom), zmanipulowane dzienniki i niezakończone gry. Filtr wulgarnych nicków. Bez IP i bez logów. Losowość od serwera (`src/game/run.ts`): seed losuje serwer, a każdy ruch z losowaniem (podróż, decyzja przy kontroli, napad) gra najpierw wysyła na serwer; serwer zapisuje decyzję, wstawia przed nią porcję losowości `['e', n]` i dopiero wtedy ją zdradza. Znając kod i seed nie da się więc przewidzieć jutra (wcześniej dało się — ktoś przeliczył całą grę i wyciągnął 9,3 mln zł na trudnym). Ruchy bez losowania (handel, bank, sklep) idą do serwera hurtem przy następnym losowaniu. Serwer na koniec odtwarza grę „ściśle”: każdy ruch, który losuje, musi stać tuż po losowości od serwera. Brak sieci: okno „spróbuj ponownie / graj bez rankingu”; gra offline trafia tylko do rankingu na urządzeniu. Zostaje: porzucanie gier z pechowym startem (mało daje) i bot grający na bieżących danych (to już po prostu dobra gra).
- **SEO PL + EN:** osobne strony `/` (PL) i `/en/` (EN) z własnym tytułem, opisem, `hreflang`, `canonical`, Open Graph (`og.png`), danymi strukturalnymi `VideoGame` (JSON-LD) i mapą strony (`sitemap-index.xml`). Pod grą jest statyczny opis „Jak grać” w języku strony, czytelny dla wyszukiwarek. Przełącznik PL/EN w grze zmienia też adres strony.
- **Cookies / RODO:** gra nie ustawia cookies i nie ma analityki; localStorage służy wyłącznie do funkcji gry (zapis, język, nick, ranking), więc baner zgody nie jest potrzebny. Jeśli kiedyś dojdzie analityka, wybrać rozwiązanie bez cookies (np. GoatCounter, Plausible) albo dodać baner.
- **Do zrobienia po publikacji:** zgłosić stronę i mapę strony w Google Search Console (i Bing Webmaster Tools).

## 15. Otwarte kwestie

- [x] Nazwa: Nocny Kurs / Night Run. Własnej domeny na razie nie kupujemy.
- [ ] Imiona i charakter postaci (lichwiarz, kontakty, mama).
- [ ] Styl ilustracji: zamówić grafika czy generować?
- [ ] Muzyka i dźwięki.
- [ ] Bramka wieku 18+ na starcie. Model zarabiania (sieci reklamowe mogą odrzucić tematykę narkotykową; rozważyć dotacje/„postaw kawę” albo kosmetyczne płatności).
- [x] Wybór frameworka: Astro + Svelte 5 + TanStack (§14).
- [x] UI wyspy gry: Svelte 5.
