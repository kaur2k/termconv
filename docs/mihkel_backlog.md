## Mihkli toimetamised EKI tehnotargana

- 2016-04-01, 11:30-14:30, 3h  
    **Koosolek** Tõnise, Kauri ja terminitüdrukutega; aftekas Tõnise ja Kauriga.

- ... 1h  
    Tehnoloogiline maakuulamine, vestlused targematega. Tunnike.

- 2016-04-07, 11:00-15:00, 4h  
    **Õpipaja** Kauriga  
    Valisime teemaks terminibaasi avaliku otsa. Õpipaja lõpuks valmis [xml-baaside importer](https://github.com/mitselek/termconv) elasticsearch andmebaasi.  
    Järgmiseks korraks leidsime, et realistlik on angulari abil töötav prototüüp imporditud andmetelt.

- ... 4h
    - Viimistlesin importerit.
    - Lisasin andmemäppimise - tulemuseks parem loetavus ja mitu korda väiksem infohulk.
    - Ei suutnud kiusatusele vastu seista, tegin prototüüpvormi. Militermi baasist täpse vaste otsing sooritatakse 3-4ms

- 2016-04-12, 13:00-16:00, 3h  
    **Õpipaja** Kauriga  
    - Uurisime prototüüpi
    - Alustasime "teha vaja" ja "mureks on" [nimekirjaga](https://github.com/kaur2k/termconv/issues)
    - Katsetasime suuremate baaside importi - [tekkisid mäluprobleemid](https://github.com/kaur2k/termconv/issues/6)
    - Katsusime Kauri tööarvutisse arenduskeskkonda seadistada - [tõrge](https://github.com/kaur2k/termconv/issues/4)

- ... 4h
    - Räägin EKRK'ga, minuarust on otstarbekas baase nende juures majutada
    - Räägin Mardiga - kui asjaosalised on nõus, siis kuidas näeks ta arendus- ja töökeskkondi EKRK serverites
    - Lahendan [impordi skripti mälupiirangud](https://github.com/kaur2k/termconv/issues/6) elegantselt, prognoos 2h, läks 2h
        - selgus, et tuleb veelkord tehnoloogiat vahetada. Prognoos 2h, läks 15h erinevate XML parserite tundmaõppimiseks ja 1h rakendamiseks
    - Kindlasti tuleb ka mäpper ümber seada, prognoos 2h, läks 1h

...
    - Õpin, mismoodi [elasticsearch täisteksti](https://github.com/kaur2k/termconv/issues/1) otsima panna (ja teen seda), prognoos 3h
