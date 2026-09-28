// Dictionary.js
const dictionary = {
    en: {
        menu: ["Home", "How to Use/FAQ", "Features", "Supported Formats"],
        lang: {
            en: "English",
            mg: "Malagasy",
            fr: "French"
        },
        donate: "Donate",
        stream: ["Streamline Your", "Downloads"],
        headline: ["Effortlessly Download and Enjoy", "Your YouTube Playlists"],
        placeholder: "Paste the video or the playlist URL here !",
        button: {
            conversion: "Start conversion",
            quality: "Quality"
        },
        followus: "Follow Us",
        scroll: "Scroll",
        swipe: "Swipe",
        explore: "to explore",
        features: "Features",
        featureDescription: "Explore the key functionalities that make our service stand out.",
        featuresCard: [
            {
                title: "1. YouTube Audio & Video",
                content: ["- Download YouTube videos in MP4 format with multiple resolution options (1080p, 720p, etc)", "- Extract audio from YouTube videos in MP3 format", "- Support for single video downloads with processing"]
            }, {
                title: "2. YouTube Playlist Downloader",
                content: ["- Download entire YouTube playlists in one click", "- Choose between video or audio formats", "- Maintain video order as in the original playlist"]
            }, {
                title: "3. Extra Functionalities",
                content: ["- Support for multiple languages", "- Works on all devices (PC, mobile, tablet)", "- No registration required, 100% free to use"]
            }
        ],
        supportedFormat: "Supported Formats",
        supportedFormatContent: "Our platform supports only **MP3** for audio and **MP4** for video to provide the best quality and compatibility across all devices. **MP4** is a widely used video format that balances high quality with efficient compression, allowing you to download videos in various resolutions like **1080p, 720p, and 480p**. On the other hand, **MP3** is the most popular audio format, offering excellent sound quality with small file sizes, making it perfect for music and podcasts. Whether you're downloading videos or extracting audio, these formats ensure smooth playback on any device.",
        mp4: "High-quality video format with multiple resolution options.",
        mp3: "Compressed audio format for clear sound quality.",
        socialMedia: "Social Media",
        copyright: "All rights reserved.",
        termsconditions: "Terms & conditions | Privacy Policy",

        legal: {
            updatedAt: "Last updated: September 28, 2026",
            backHome: "Back to home",
            onthispage: "On this page",
            terms: "Terms & Conditions",
            termsIntro: "These Terms & Conditions (\"Terms\") govern your use of Tubeko (\"Tubeko\", \"we\", \"us\"), a free web service for downloading and converting publicly available YouTube videos and playlists. By accessing or using Tubeko you agree to be bound by these Terms. If you do not agree, please do not use the service.",
            termsSections: [
                {
                    title: "1. Acceptance of the Terms",
                    body: [
                        "By opening Tubeko in a browser, pasting a URL, or downloading any file, you confirm that you have read, understood, and accepted these Terms and our Privacy Policy. These Terms apply to every visitor, whether on a computer, tablet, or phone.",
                        "We may update these Terms from time to time. The date at the top of this page always shows the version in force, and continuing to use Tubeko after a change means you accept the updated Terms."
                    ]
                },
                {
                    title: "2. Description of the Service",
                    body: [
                        "Tubeko lets you paste a YouTube video or playlist link and download its content as MP4 video or MP3 audio. The service runs in your browser and on our servers, is free of charge, and requires no account or registration.",
                        "We may add, change, suspend, or remove any part of the service at any time, including limits on the size or number of downloads, to keep it available and fair for everyone."
                    ]
                },
                {
                    title: "3. Acceptable Use",
                    body: [
                        "When using Tubeko you agree to:",
                        "- Download only content you have the right to download: your own uploads, content in the public domain, content released under a permissive licence, or content you have the copyright holder's permission to copy.",
                        "- Not use the service to infringe anyone's copyright or other intellectual-property rights.",
                        "- Not attempt to disrupt, overload, reverse-engineer, or gain unauthorised access to Tubeko or its infrastructure.",
                        "- Not resell, redistribute as a paid product, or present Tubeko as your own service.",
                        "- Not use automated systems to scrape or spam the service.",
                        "- Comply with all laws that apply to you, including YouTube's own Terms of Service."
                    ]
                },
                {
                    title: "4. Intellectual Property",
                    body: [
                        "The Tubeko name, logo, design, and source code are the property of their owners and are protected by applicable law. Nothing in these Terms transfers any ownership to you.",
                        "Videos, music, and any other material you download belong to their respective creators and rights holders. Tubeko does not host, store, or claim any rights over third-party content; it only transfers files at your request."
                    ]
                },
                {
                    title: "5. Copyright Infringement and Takedowns",
                    body: [
                        "If you believe your copyrighted work has been made available or misused through Tubeko, contact us at nyora.help@gmail.com with enough detail for us to act: identification of the work, the URL or material involved, your contact information, and a statement of good-faith belief and authority.",
                        "We review every request and will remove access or take other appropriate action where a claim is valid."
                    ]
                },
                {
                    title: "6. Disclaimers",
                    body: [
                        "Tubeko is provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.",
                        "We do not warrant that the service will be uninterrupted, error-free, or that downloads will always succeed. YouTube may change its platform at any time in ways that break parts of the service, and availability of any video depends on its source.",
                        "You use the service at your own risk and are solely responsible for the files you download and what you do with them."
                    ]
                },
                {
                    title: "7. Limitation of Liability",
                    body: [
                        "To the maximum extent permitted by law, Tubeko and its operators are not liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or business, arising from or relating to your use of - or inability to use - the service.",
                        "Where liability cannot be excluded, it is limited, at our option, to resupplying the service or the cost of having it resupplied."
                    ]
                },
                {
                    title: "8. Changes to the Service",
                    body: [
                        "We work hard to keep Tubeko free and available, but we may modify, interrupt, or discontinue any part of it at any time, with or without notice. Nothing in these Terms obliges us to maintain any feature or availability."
                    ]
                },
                {
                    title: "9. Governing Law",
                    body: [
                        "These Terms are governed by the laws of Madagascar, without regard to conflict-of-law rules. Any dispute arising from them is subject to the exclusive jurisdiction of the competent courts of that country, unless mandatory local law gives you a different forum.",
                        "If any provision of these Terms is found unenforceable, the remaining provisions stay in full force."
                    ]
                },
                {
                    title: "10. Contact",
                    body: [
                        "Questions about these Terms can be sent to nyora.help@gmail.com. We aim to reply within a reasonable time."
                    ]
                }
            ],
            privacy: "Privacy Policy",
            privacyIntro: "This Privacy Policy explains what information Tubeko collects when you use it, why, and the choices you have. We collect as little as possible: the service works without an account, and we do not sell or rent your data.",
            privacySections: [
                {
                    title: "1. Overview",
                    body: [
                        "Tubeko is a free tool for downloading YouTube videos and playlists. This policy applies to the Tubeko website and its processing of your data. It covers what we collect, how we use it, and your rights over it."
                    ]
                },
                {
                    title: "2. Information We Collect",
                    body: [
                        "Tubeko has no accounts, no sign-up, and no newsletter, so we never ask for your name, email, or payment details.",
                        "- Requests you make: the YouTube URL you paste, the format and quality you choose, and the technical details needed to fetch and deliver the file (video identifiers, itag parameters, playlist identifiers).",
                        "- Technical logs: our servers may temporarily record the requesting IP address, user agent, and timestamps in ordinary access logs kept for security and stability.",
                        "- Local browser storage: your language choice and interface preferences are kept in your browser so the site remembers them between visits."
                    ]
                },
                {
                    title: "3. How We Use Information",
                    body: [
                        "We use the information above only to:",
                        "- Fetch, convert, and deliver the files you ask for;",
                        "- Keep the service secure, prevent abuse, and diagnose faults;",
                        "- Understand aggregate usage so we know what to maintain and improve.",
                        "We do not build advertising profiles, we do not sell or rent your data, and we do not share it with third parties for their own marketing."
                    ]
                },
                {
                    title: "4. Cookies and Local Storage",
                    body: [
                        "Tubeko does not set advertising or tracking cookies. The only persistent storage is local to your browser and holds functional preferences such as your selected interface language. Clearing your browser storage removes it.",
                        "If our hosting later adds strictly necessary or analytics cookies, this policy will be updated before that happens."
                    ]
                },
                {
                    title: "5. Third-Party Services",
                    body: [
                        "To do its job, Tubeko necessarily talks to YouTube when you submit a link. Your request reaches YouTube's public endpoints, which means YouTube (Google) receives your IP address and request details under Google's own privacy policy. We cannot control that processing, but we send the minimum needed to resolve your download.",
                        "Otherwise we do not embed third-party analytics or advertising scripts."
                    ]
                },
                {
                    title: "6. Data Retention",
                    body: [
                        "Files are streamed and converted on the fly and are not stored on our servers after delivery. Request data lives only as long as needed to complete your download.",
                        "Server access logs, where kept, are short-lived and used only for security and stability; we do not use them to profile you."
                    ]
                    },
                {
                    title: "7. Your Rights",
                    body: [
                        "Because we hold almost no personal data, most data-protection rights (such as access, rectification, erasure, and objection under the GDPR or similar laws) are straightforward to honour: write to nyora.help@gmail.com and we will help.",
                        "You can also exercise control directly: use the service without providing personal data, clear your browser storage at any time, or simply stop using Tubeko."
                    ]
                },
                {
                    title: "8. Children's Privacy",
                    body: [
                        "Tubeko is not directed at children under 13 (or the age set by your local law). We do not knowingly collect personal information from children; since there are no accounts, none is sought. If you believe a child has provided us with personal data, write to nyora.help@gmail.com and we will delete it."
                    ]
                },
                {
                    title: "9. Security",
                    body: [
                        "We take reasonable technical and organisational measures to protect the service and any data passing through it, served over HTTPS. No method of transmission over the Internet is perfectly secure, so we cannot guarantee absolute security."
                    ]
                },
                {
                    title: "10. Changes to This Policy",
                    body: [
                        "We may update this policy as the service evolves. The date at the top of this page shows the current version, and material changes will be highlighted on the site before they take effect."
                    ]
                },
                {
                    title: "11. Contact Us",
                    body: [
                        "For any privacy question or request, write to nyora.help@gmail.com and we will get back to you within a reasonable time."
                    ]
                }
            ]
        }
    },
    mg: {
        menu: ["Fandraisana", "Ahoana ny fampiasa azy/FAQ", "Ireo Tolotra", "Ireo endrika nomerika"],
        lang: {
            en: "Anglisy",
            mg: "Malagasy",
            fr: "Frantsay"
        },
        donate: "Handefa fankasitrahana",
        stream: ["Hafaingano ny", "Fakanao Horonan-Tsary"],
        headline: ["Alaivo amin'ny fomba tsotra ary ankafizo", "Ireo horontsary Youtube"],
        placeholder: "Apetraho eto ny URL-n'ny horonantsary na ny playlist !",
        button: {
            conversion: "Hatomboka",
            quality: "Kalitao"
        },
        followus: "Araho amin'ny rohy",
        scroll: "Hamantatra",
        swipe: "Hamantatra",
        explore: "misymisy",
        features: "Tolotra",
        featureDescription: "Fantaro ireo mampiavaka ny tolotra",
        featuresCard: [
            {
                title: "1. Horonantsary sy horonampeo Youtube",
                content: ["- Ahafahana maka horonantsary MP4 sy horonanmpeo MP3 tsara kalitao", "- Manavaka ny horonampeo amin'ny horonantsary", ""]
            }, {
                title: "2. Andian-koronantsary Youtube",
                content: ["- Maka andian-koronantsary sy feo amin'ny tendry tokana", "- Afaka misafidy na horonantsary na feo", "- Mitazona ny filahatrin'ny horonantsary"]
            }, {
                title: "3. Tolotra fanampiny",
                content: ["- Ahitana tenim-pirenena samihafa", "- Afaka ampiasaina na amin'ny finday na amin'ny ordinatera", "- Tsy mila fanokafana kaonty, 100% maimaim-poana"]
            }
        ],
        supportedFormat: "Ireo endrika nomerika",
        supportedFormatContent: "Ny endrika MP3 amin'ny horonampeo sy MP4 amin'ny horonantsary ihany no mbola azo kirakiraina eto amin'ity tranonkala mba ahafana manome ny kalitao ambony indrindra ho an'ny fitaovana rehetra. Ny **MP4** dia endrika horonantsary be mpampiasa izay manambatra kalitao avo, ahafahanao misintona horonantsary amin'ny kalitao isan-karazany toy ny **1080p, 720p, ary 480p**. Etsy ankilany, ny **MP3** dia endrika horonampeo malaza indrindra, manome feo mazava tsara, mety tsara amin'ny mozika sy \"podcast\". Na maka horonantsary ianao na maka horonampe, ireo endrika ireo dia miantoka famakiana mazava amin'ny fitaovana rehetra.",
        mp4: "Endrika horonantsary avo kalitao misy hisafiadianana maro",
        mp3: "Horonampeo amin'ny kalitao ambony voafintina manome feo mazava tsara.",
        socialMedia: "Social Media",
        copyright: "All rights reserved.",
        termsconditions: "Fitsipika mifehy ny tranonkala",

        legal: {
            updatedAt: "Nohavaozina farany: 28 Septambra 2026",
            backHome: "Hiverina any an-tokantrano",
            onthispage: "Ao amin'ity pejy ity",
            terms: "Fepetra sy fitsipika",
            termsIntro: "Ireo fepetra sy fitsipika (\"Fepetra\") dia mifehy ny fampiasanao ny Tubeko (\"Tubeko\", \"izahay\"), serivisy aterineto maimaim-poana ahafahana maka sy mamadika horonantsary sy andian-koronantsary YouTube misokatra ho an'ny rehetra. Rehefa mampiasa ny Tubeko ianao dia manaiky ny ho fehezin'ireo Fepetra ireo. Raha tsy manaiky azy, aza mampiasa ny serivisy.",
            termsSections: [
                {
                    title: "1. Fanekena ny Fepetra",
                    body: [
                        "Rehefa manokatra ny Tubeko amin'ny navigateur, mametaka URL, na maka rakitra ianao, dia manamarina fa namaky, azonao ary nanaiky ireo Fepetra sy ny Politika momba ny tsiambaratelo. Mihatra amin'ny mpitsidika rehetra ireo Fepetra, na amin'ny ordinatera, tabilao na finday.",
                        "Mety havaozina indraindray ireo Fepetra. Ny daty eo ambony pejy no mampiseho ny dika misy an'izao fotoana, ary ny fampiasana ny Tubeko rehefa avy niova ny Fepetra dia midika fa manaiky izany fiovana izany ianao."
                    ]
                },
                {
                    title: "2. Famaritana ny serivisy",
                    body: [
                        "Ahafahanao mametaka rohy video na andian-koronantsary YouTube sy maka ny votoatiny amin'ny endrika MP4 na feo MP3 ny Tubeko. Miasa ao amin'ny navigateur sy amin'ny mpizara izy, maimaim-poana, tsy mitaky kaonty na fanokafana.",
                        "Afaka manampy, manova, manakana na manala ny ampahany amin'ny serivisy isika amin'ny fotoana rehetra, anisan'izany ny famerana ny habeny na ny isan'ny fampidinana, mba hitazomana azy ho misokatra sy mitovy ho an'ny rehetra."
                    ]
                },
                {
                    title: "3. Fampiasana ara-dalàna",
                    body: [
                        "Rehefa mampiasa ny Tubeko ianao dia manaiky ny:",
                        "- Maka votoaty azonao alaina ihany: ny namboarinao, ny an'ny besinimaro (domaine public), ny misy lisansy malalaka, na ny nahazo alalana avy amin'ny tompon'andraikitra.",
                        "- Tsy mampiasa ny serivisy handikana ny zon'ny mpanoratra na zon-kafa an'ny hafa.",
                        "- Tsy manandrana manelingelina, mameno, manodina ny rafitra, na miditra tsy misy alalana amin'ny Tubeko na ny rafitra misy azy.",
                        "- Tsy mivarotra, tsy mizara ho vokatra amidy, na milaza ny Tubeko ho serivisinao.",
                        "- Tsy mampiasa rafitra mandeha ho azy hitrandraka na handefa hafatra tsy ilaina amin'ny serivisy.",
                        "- Manaja ny lalàna rehetra mihatra aminao, ao anatin'izany ny fepetra fampiasana ny YouTube."
                    ]
                },
                {
                    title: "4. Fananana ara-tsaina",
                    body: [
                        "Ny anarana, ny sary famantarana, ny endrika ary ny kaody loharano dia fananan'ny tompony ary arovana araka ny lalàna mihatra. Tsy misy na dia iray aza amin'ireo Fepetra ireo manome fananana ho anao.",
                        "Ny horonantsary, ny mozika ary ny votoaty hafa alaina dia fananan'ny mpamoratra sy ny tompon'andraikitra azy. Tsy mitazona na mitaky zo amin'ny votoatin'ny hafa ny Tubeko; mandefa rakitra araka ny fangatahanao fotsiny ihany izy."
                    ]
                },
                {
                    title: "5. Fanitsakitsahana ny zon'ny mpanoratra",
                    body: [
                        "Raha mihevitra ianao fa voasarika na nampiasa tsy ara-dalàna ny asanao arovana amin'ny alalan'ny Tubeko, dia soraty any amin'ny nyora.help@gmail.com miaraka amin'ny antsipiriany ampy ahafahana mandinika: famaritana ny asa, ny URL na ny zavatra voakasika, ny antsipiriany momba anao, ary ny filazana fa mino am-pahatsorana ianao.",
                        "Dinihina ny fangatahana rehetra ary esorina ny fidirana na raisina ny hetsika mety rehefa marina ny fitakiana."
                    ]
                },
                {
                    title: "6. Tsy fananana antoka",
                    body: [
                        "Ny Tubeko dia omena \"araka ny endriny\" sy \"araka ny azo\", tsy misy antoka na inona na inona, miharihary na tsia, anisan'izany ny fahazoana tombony ara-barotra, ny fampifanaraka amin'ny tetikady manokana ary ny tsy fanitsiana ny zon'ny hafa.",
                        "Tsy antoka fa tsy hanelingelina na tsy misy diso ny serivisy, na fa ny fampidinana dia mahomby foana. Mety hanova ny rafitrany amin'ny fotoana rehetra ny YouTube amin'ny fomba mety hanelingelina ny serivisy, ary ny fisian'ny video dia miankina amin'ny loharanony.",
                        "Amin'ny risikao manokana no ampiasanao ny serivisy ary ianao irery no tompon'andraikitra amin'ny rakitra alaina sy ny fampiasana azy."
                    ]
                },
                {
                    title: "7. Famerana ny andraikitra",
                    body: [
                        "Araka ny fetran'ny lalàna, ny Tubeko sy ny mpitantana azy dia tsy tompon'andraikitra amin'ny fahasimbana tsy mivantana, tsy nahy, manokana, mifandimby na famaizana, na ny fahaverezan'ny angona, ny tombony na ny asa, vokatry ny fampiasanao - na tsy fahafahan'ny fampiasanao - ny serivisy.",
                        "Rehefa tsy azo esorina ny andraikitra, dia voafetra, araka ny safidintsika, amin'ny famerenana ny serivisy na ny vidin'ny famerenana azy."
                    ]
                },
                {
                    title: "8. Fiovan'ny serivisy",
                    body: [
                        "Miasa mafy isika hitazonana ny Tubeko maimaim-poana sy misokatra, fa mety hanova, hanakana na hanaisotra ny ampahany amin'ny serivisy amin'ny fotoana rehetra isika, misy na tsy misy fampandrenesana. Tsy misy ao amin'ireo Fepetra na inona na inona no manery anay hitazona endri-javatra na fisian'ny serivisy."
                    ]
                },
                {
                    title: "9. Lalàna mifehy",
                    body: [
                        "Ireo Fepetra ireo dia fehezin'ny lalàna malagasy, tsy manavaka ny fitsipika momba ny fifanolanana lalàna. Ny fifanolanana rehetra avy amin'izy ireo dia ao ambany fahefan'ny fitsarana mahefa amin'ity firenena ity, afa-tsy raha ny lalàna tsy azo ovana dia manome anao toeram-pitsarana hafa.",
                        "Raha hita fa tsy azo ampiharina ny andinin-teny iray amin'ireo Fepetra, dia mijanona manan-kery ny andinin-teny sisa."
                    ]
                },
                {
                    title: "10. Fifandraisana",
                    body: [
                        "Ny fanontaniana momba ireo Fepetra ireo dia alefa any nyora.help@gmail.com. Miezaka mamaly ao anatin'ny fotoana mety isika."
                    ]
                }
            ],
            privacy: "Politika momba ny tsiambaratelo",
            privacyIntro: "Ity politika ity dia manazava ny angona karakarin'ny Tubeko rehefa mampiasa azy ianao, ny antony, ary ny safidy misy anao. Kely araka izay azo atao no angoninay: miasa tsy misy kaonty ny serivisy ary tsy mivarotra na manofa ny angonao isika.",
            privacySections: [
                {
                    title: "1. Famintinana",
                    body: [
                        "Ny Tubeko dia fitaovana maimaim-poana ahafahana maka horonantsary sy andian-koronantsary YouTube. Ity politika ity dia mihatra amin'ny tranonkala Tubeko sy ny fandaminana ny angonao. Manazava izay angonina, ny fampiasana azy ary ny zonao amin'izy ireo."
                    ]
                },
                {
                    title: "2. Angona angonnay",
                    body: [
                        "Tsy misy kaonty, fanoratana anarana na fanangonana angona manokana ny Tubeko, ka tsy mangataka anarana, mailaka na angona momba ny fandoavam-bola mihitsy isika.",
                        "- Ny fangatahanao: ny URL YouTube apetrakao, ny endrika sy ny kalitao safidinao, ary ny antsipiriany ara-teknika ilaina haka sy handefasana ny rakitra (famantarana ny video, parametra itag, famantarana ny playlist).",
                        "- Diary ara-teknika: mety mitahiry vonjimaika ny IP, ny user agent ary ny ora amin'ny diary fidirana tsotra, tazonina ho an'ny fiarovana sy ny fahamarinan'ny serivisy.",
                        "- Tahiry eo an-toerana ao amin'ny navigateur: ny fiteny safidinao sy ny safidin'ny endrika dia tazonina ao amin'ny navigateur-nao mba ho tadidy amin'ny fitsidihana manaraka."
                    ]
                },
                {
                    title: "3. Fampiasana ny angona",
                    body: [
                        "Ny angona etsy ambony dia ampiasaina ahafahana:",
                        "- Maka, mamadika ary mandefa ny rakitra nangatahanao;",
                        "- Mitazona ny serivisy azo antoka, manakana ny fitondran-tena ratsy ary manamboatra ny olana;",
                        "- Mahafantatra ny fampiasana amin'ny ankapobeny mba ho fantatra izay tokony hohazonina sy hatsaraina.",
                        "Tsy manangana profil ara-barotra isika, tsy mivarotra na manofa ny angonao, ary tsy mizara azy amin'ny hafa hanaovana dokam-barotra."
                    ]
                },
                {
                    title: "4. Cookies sy fitahirizana eo an-toerana",
                    body: [
                        "Tsy mametraka cookie ara-barotra na fanaraha-maso ny Tubeko. Ny fitahirizana maharitra tokana dia ao amin'ny navigateur-nao ihany, mitazona safidy ara-teknika toy ny fiteny. Ny famafana ny tahiry ao amin'ny navigateur no manala azy.",
                        "Raha toa ka manampy cookie ilaina na statistika ny mpampiantrano rehefa mandroso ny fotoana, dia havaozina ity politika ity alohan'izay."
                    ]
                },
                {
                    title: "5. Serivisy an'ny hafa",
                    body: [
                        "Vao mandefa rohy ianao dia miresaka amin'ny YouTube ny Tubeko, satria izay no fomba fiasany. Ny fangatahanao dia mahatratra ny serivisin'ny YouTube, ka ny YouTube (Google) no mahazo ny IP-nao sy ny antsipirian'ny fangatahana araka ny politikan'izy ireo. Tsy manapaka izany fanodinana izany isika, fa ny kely indrindra ihany no alefa mba hahazoana ny fampidinana.",
                        "Afa-tsy izany, tsy misy script an'ny hafa na statistika na dokam-barotra ampidirina."
                    ]
                },
                {
                    title: "6. Faharetan'ny fitahirizana",
                    body: [
                        "Ny rakitra dia alefa sy avadika avy hatrany ary tsy tazonina amin'ny mpizara rehefa vita ny fandefasana. Ny angon'ny fangatahana dia velona mandra-pahavitan'ny fampidinana.",
                        "Ny log fidirana amin'ny mpizara, raha misy, dia fohy ny androm-piainany ary ampiasaina ho an'ny fiarovana sy ny fahamarinana; tsy ampiasaina hamaritana ny mombamomba anao."
                    ]
                },
                {
                    title: "7. Ny zonao",
                    body: [
                        "Satria vitsy dia vitsy ny angona manokana tazonintsika, ny ankamaroan'ny zo (fidirana, fanitsiana, famafana, fanoherana araka ny GDPR na lalàna mitovy amin'izany) dia mora tanterahina: soraty any amin'ny nyora.help@gmail.com dia hanampy anao izahay.",
                        "Azonao atao koa ny mibaiko mivantana: mampiasa ny serivisy tsy misy angona manokana, famafana ny tahiry ao amin'ny navigateur amin'ny fotoana rehetra, na mijanona tsy mampiasa ny Tubeko."
                    ]
                },
                {
                    title: "8. Zaza",
                    body: [
                        "Tsy natokana ho an'ny ankizy latsaky ny 13 taona (na ny taona voafaritry ny lalànao) ny Tubeko. Tsy mangingina mangataka angona manokana amin'ny ankizy isika; tsy misy kaonty, ka tsy misy angatahana. Raha mihevitra ianao fa nanome angona manokana ny zaza, soraty any amin'ny nyora.help@gmail.com dia hamafa azy izahay."
                    ]
                },
                {
                    title: "9. Fiarovana",
                    body: [
                        "Mampiasa fepetra ara-teknika sy ara-pandaminana mety isika hiarovana ny serivisy sy ny angona mandalo, alefa amin'ny HTTPS. Tsy misy fomba fandefasana amin'ny aterineto azo antoka tanteraka, ka tsy azo antoka ny fiarovana tanteraka."
                    ]
                },
                {
                    title: "10. Fanavaozana ity politika ity",
                    body: [
                        "Mety havaozina ity politika ity rehefa mivoatra ny serivisy. Ny daty eo ambony pejy no mampiseho ny dika misy an'izao fotoana, ary ny fanovana lehibe dia hambara eo amin'ny tranonkala alohan'ny hampiharana azy."
                    ]
                },
                {
                    title: "11. Antsoy izahay",
                    body: [
                        "Ho an'ny fanontaniana na fangatahana momba ny tsiambaratelo, soraty any amin'ny nyora.help@gmail.com ary hamaly ao anatin'ny fotoana mety isika."
                    ]
                }
            ]
        }
    },
    fr: {
        menu: ["Accueil", "Comment utiliser / FAQ", "Fonctionnalités", "Formats pris en charge"],
        lang: {
            en: "Anglais",
            mg: "Malagasy",
            fr: "Français"
        },
        donate: "Faire un don",
        stream: ["Optimisez vos", "Téléchargements"],
        headline: ["Téléchargez et profitez facilement", "de vos playlists Youtube"],
        placeholder: "Coller l'URL de la video ou de la playlist ici !",
        button: {
            conversion: "Démarrer la conversion",
            quality: "Qualité"
        },
        followus: "Suivez-nous",
        scroll: "Faites défiler ",
        swipe: "Faites glisser",
        explore: "pour explorer",
        features: "Fonctionnalités",
        featureDescription: "Découvrez les fonctionnalités clés qui distinguent notre service.",
        featuresCard: [
            {
                title: "1. Audio et Vidéo YouTube",
                content: [
                    "- Télécharger des vidéos YouTube au format MP4 avec plusieurs options de résolution (1080p, 720p, etc.)",
                    "- Extraire l’audio des vidéos YouTube au format MP3",
                    "- Prise en charge du téléchargement de vidéos individuelles avec traitement"
                ]
            },
            {
                title: "2. Téléchargeur de playlists YouTube",
                content: [
                    "- Télécharger des playlists YouTube complètes en un clic",
                    "- Choisir entre les formats vidéo ou audio",
                    "- Maintenir l’ordre des vidéos comme dans la playlist originale"
                ]
            },
            {
                title: "3. Fonctionnalités supplémentaires",
                content: [
                    "- Support multilingue",
                    "- Fonctionne sur tous les appareils (PC, mobile, tablette)",
                    "- Aucune inscription requise, 100 % gratuit"
                ]
            }

        ],
        supportedFormat: "Formats pris en charge",
        supportedFormatContent: "Notre plateforme supporte uniquement le format **MP3** pour l’audio et **MP4** pour la vidéo afin d’offrir la meilleure qualité et compatibilité sur tous les appareils. **MP4** est un format vidéo largement utilisé qui équilibre haute qualité et compression efficace, vous permettant de télécharger des vidéos en plusieurs résolutions telles que **1080p, 720p, et 480p**. Quant à **MP3**, c’est le format audio le plus populaire, offrant une excellente qualité sonore avec des fichiers de petite taille, idéal pour la musique et les podcasts. Que vous téléchargiez des vidéos ou extrayiez de l’audio, ces formats garantissent une lecture fluide sur tous les appareils.",
        mp4: "Format vidéo de haute qualité avec plusieurs options de résolution.",
        mp3: "Format audio compressé offrant une qualité sonore claire.",
        socialMedia: "Réseaux sociaux",
        copyright: "Tous droits réservés.",
        termsconditions: "Conditions générales | Politique de confidentialité",

        legal: {
            updatedAt: "Dernière mise à jour : 28 septembre 2026",
            backHome: "Retour à l’accueil",
            onthispage: "Sur cette page",
            terms: "Conditions générales",
            termsIntro: "Les présentes Conditions générales (\"Conditions\") régissent votre utilisation de Tubeko (\"Tubeko\", \"nous\"), un service web gratuit de téléchargement et de conversion de vidéos et de playlists YouTube publiquement accessibles. En accédant à Tubeko ou en l’utilisant, vous acceptez d’être lié par ces Conditions. Si vous n’êtes pas d’accord, veuillez ne pas utiliser le service.",
            termsSections: [
                {
                    title: "1. Acceptation des Conditions",
                    body: [
                        "En ouvrant Tubeko dans un navigateur, en collant une URL ou en téléchargeant un fichier, vous confirmez avoir lu, compris et accepté ces Conditions ainsi que notre Politique de confidentialité. Ces Conditions s’appliquent à tout visiteur, sur ordinateur, tablette ou téléphone.",
                        "Nous pouvons mettre à jour ces Conditions de temps à autre. La date en haut de cette page indique toujours la version en vigueur, et continuer à utiliser Tubeko après une modification vaut acceptation des Conditions mises à jour."
                    ]
                },
                {
                    title: "2. Description du service",
                    body: [
                        "Tubeko vous permet de coller un lien vers une vidéo ou une playlist YouTube et d’en télécharger le contenu en vidéo MP4 ou en audio MP3. Le service fonctionne dans votre navigateur et sur nos serveurs, est gratuit et ne demande aucun compte ni inscription.",
                        "Nous pouvons ajouter, modifier, suspendre ou supprimer tout ou partie du service à tout moment, notamment des limites de taille ou de nombre de téléchargements, afin de le garder disponible et équitable pour tous."
                    ]
                },
                {
                    title: "3. Usage acceptable",
                    body: [
                        "En utilisant Tubeko, vous vous engagez à :",
                        "- Ne télécharger que des contenus que vous avez le droit de télécharger : vos propres publications, des contenus du domaine public, des contenus sous licence permissive, ou des contenus dont le titulaire des droits vous a donné l’autorisation.",
                        "- Ne pas utiliser le service pour porter atteinte aux droits d’auteur ou autres droits de propriété intellectuelle d’autrui.",
                        "- Ne pas tenter de perturber, de surcharger, de rétro-ingénierer ni d’accéder sans autorisation à Tubeko ou à son infrastructure.",
                        "- Ne pas revendre, redistribuer comme produit payant ni présenter Tubeko comme votre propre service.",
                        "- Ne pas utiliser de systèmes automatisés pour extraire ou spammer le service.",
                        "- Respecter toutes les lois qui vous concernent, y compris les conditions d’utilisation de YouTube."
                    ]
                },
                {
                    title: "4. Propriété intellectuelle",
                    body: [
                        "Le nom, le logo, le design et le code source de Tubeko sont la propriété de leurs titulaires et protégés par le droit applicable. Rien dans ces Conditions ne vous transfère une quelconque propriété.",
                        "Les vidéos, musiques et autres contenus téléchargés appartiennent à leurs créateurs et ayants droit respectifs. Tubeko n’héberge, ne stocke et ne revendique aucun droit sur les contenus de tiers ; il ne fait que transférer des fichiers à votre demande."
                    ]
                },
                {
                    title: "5. Contrefaçon et retraits",
                    body: [
                        "Si vous estimez que votre œuvre protégée a été rendue disponible ou utilisée à tort via Tubeko, contactez-nous à nyora.help@gmail.com avec suffisamment de détails pour agir : identification de l’œuvre, URL ou matériau concerné, vos coordonnées, et une déclaration de croyance de bonne foi et de qualité.",
                        "Nous examinons chaque demande et retirerons l’accès ou prendrons toute autre mesure appropriée lorsque la réclamation est fondée."
                    ]
                },
                {
                    title: "6. Exclusion de garanties",
                    body: [
                        "Tubeko est fourni \"en l’état\" et \"selon disponibilité\", sans garantie d’aucune sorte, expresse ou implicite, notamment de qualité marchande, d’adaptation à un usage particulier et de non-contrefaçon.",
                        "Nous ne garantissons pas que le service sera ininterrompu ou exempt d’erreurs, ni que les téléchargements réussiront toujours. YouTube peut modifier sa plateforme à tout moment de manière à affecter le service, et la disponibilité d’une vidéo dépend de sa source.",
                        "Vous utilisez le service à vos propres risques et êtes seul responsable des fichiers téléchargés et de leur utilisation."
                    ]
                },
                {
                    title: "7. Limitation de responsabilité",
                    body: [
                        "Dans la mesure maximale permise par la loi, Tubeko et ses exploitants ne sont pas responsables des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, ni de toute perte de données, de profits ou d’exploitation, résultant de votre utilisation - ou de l’impossibilité d’utiliser - le service.",
                        "Lorsque la responsabilité ne peut être exclue, elle est limitée, à notre choix, à la restitution du service ou au coût de sa restitution."
                    ]
                },
                {
                    title: "8. Évolution du service",
                    body: [
                        "Nous nous efforçons de garder Tubeko gratuit et disponible, mais nous pouvons modifier, interrompre ou cesser toute partie du service à tout moment, avec ou sans préavis. Rien dans ces Conditions ne nous oblige à maintenir une fonctionnalité ou une disponibilité quelconque."
                    ]
                },
                {
                    title: "9. Droit applicable",
                    body: [
                        "Les présentes Conditions sont régies par le droit malgache, sans égard aux règles de conflit de lois. Tout litige découlant de celles-ci relève de la compétence exclusive des tribunaux compétents de ce pays, sauf si la loi locale impérative vous accorde un autre forum.",
                        "Si une disposition de ces Conditions est jugée inapplicable, les autres dispositions restent pleinement en vigueur."
                    ]
                },
                {
                    title: "10. Contact",
                    body: [
                        "Les questions relatives à ces Conditions peuvent être envoyées à nyora.help@gmail.com. Nous nous efforçons de répondre dans un délai raisonnable."
                    ]
                }
            ],
            privacy: "Politique de confidentialité",
            privacyIntro: "Cette Politique de confidentialité explique quelles informations Tubeko collecte lorsque vous l’utilisez, pourquoi, et les choix dont vous disposez. Nous collectons le minimum : le service fonctionne sans compte et nous ne vendons ni ne louons vos données.",
            privacySections: [
                {
                    title: "1. Aperçu",
                    body: [
                        "Tubeko est un outil gratuit de téléchargement de vidéos et de playlists YouTube. Cette politique s’applique au site Tubeko et à son traitement de vos données. Elle couvre ce que nous collectons, comment nous l’utilisons et vos droits à son sujet."
                    ]
                },
                {
                    title: "2. Informations collectées",
                    body: [
                        "Tubeko n’a ni compte, ni inscription, ni newsletter : nous ne vous demandons jamais votre nom, votre e-mail ni vos coordonnées bancaires.",
                        "- Requêtes que vous effectuez : l’URL YouTube collée, le format et la qualité choisis, et les détails techniques nécessaires pour récupérer et livrer le fichier (identifiants de vidéo, paramètres itag, identifiants de playlist).",
                        "- Journaux techniques : nos serveurs peuvent temporairement enregistrer l’adresse IP, l’agent utilisateur et l’horodatage dans des journaux d’accès ordinaires, conservés pour la sécurité et la stabilité.",
                        "- Stockage local du navigateur : votre langue d’interface et vos préférences sont conservées dans votre navigateur pour que le site s’en souvienne entre vos visites."
                    ]
                },
                {
                    title: "3. Utilisation des informations",
                    body: [
                        "Nous utilisons les informations ci-dessus uniquement pour :",
                        "- Récupérer, convertir et livrer les fichiers demandés ;",
                        "- Garder le service sûr, prévenir les abus et diagnostiquer les pannes ;",
                        "- Comprendre l’usage global afin de savoir quoi maintenir et améliorer.",
                        "Nous ne construisons pas de profils publicitaires, ne vendons ni ne louons vos données et ne les partageons pas avec des tiers à des fins marketing."
                    ]
                },
                {
                    title: "4. Cookies et stockage local",
                    body: [
                        "Tubeko ne dépose pas de cookies publicitaires ou de suivi. Le seul stockage persistant est local à votre navigateur et contient des préférences fonctionnelles, comme la langue d’interface choisie. Vider le stockage de votre navigateur suffit à le supprimer.",
                        "Si notre hébergement ajoute un jour des cookies strictement nécessaires ou analytiques, cette politique sera mise à jour avant."
                    ]
                },
                {
                    title: "5. Services tiers",
                    body: [
                        "Pour fonctionner, Tubeko échange nécessairement avec YouTube lorsque vous soumettez un lien. Votre requête atteint les points d’accès publics de YouTube : YouTube (Google) reçoit donc votre adresse IP et les détails de la requête, selon la politique de confidentialité de Google. Nous ne maîtrisons pas ce traitement, mais nous n’envoyons que le strict nécessaire pour résoudre votre téléchargement.",
                        "Sinon, nous n’intégrons aucun script tiers d’analyse ou de publicité."
                    ]
                },
                {
                    title: "6. Conservation des données",
                    body: [
                        "Les fichiers sont diffusés et convertis à la volée et ne sont pas stockés sur nos serveurs après la livraison. Les données de requête ne vivent que le temps de compléter votre téléchargement.",
                        "Les journaux d’accès serveur, lorsqu’ils existent, sont éphémères et servent uniquement à la sécurité et à la stabilité ; nous ne les utilisons pas pour vous profiler."
                    ]
                },
                {
                    title: "7. Vos droits",
                    body: [
                        "Comme nous détenons très peu de données personnelles, la plupart des droits (accès, rectification, effacement, opposition au titre du RGPD ou de lois similaires) sont simples à honorer : écrivez à nyora.help@gmail.com et nous vous aiderons.",
                        "Vous pouvez aussi reprendre le contrôle directement : utiliser le service sans fournir de données personnelles, vider le stockage de votre navigateur à tout moment, ou cesser simplement d’utiliser Tubeko."
                    ]
                },
                {
                    title: "8. Vie privée des enfants",
                    body: [
                        "Tubeko ne s’adresse pas aux enfants de moins de 13 ans (ou l’âge fixé par votre loi locale). Nous ne collectons pas sciemment d’informations personnelles auprès d’enfants ; sans compte, rien n’est sollicité. Si vous pensez qu’un enfant nous a transmis des données personnelles, écrivez à nyora.help@gmail.com et nous les supprimerons."
                    ]
                },
                {
                    title: "9. Sécurité",
                    body: [
                        "Nous appliquons des mesures techniques et organisationnelles raisonnables pour protéger le service et les données qui le traversent, servi en HTTPS. Aucune transmission sur Internet n’est parfaitement sûre : nous ne pouvons garantir une sécurité absolue."
                    ]
                },
                {
                    title: "10. Modifications de cette politique",
                    body: [
                        "Nous pouvons mettre à jour cette politique à mesure que le service évolue. La date en haut de cette page indique la version en vigueur, et les changements importants seront signalés sur le site avant leur entrée en vigueur."
                    ]
                },
                {
                    title: "11. Nous contacter",
                    body: [
                        "Pour toute question ou demande relative à la vie privée, écrivez à nyora.help@gmail.com et nous vous répondrons dans un délai raisonnable."
                    ]
                }
            ]
        }
    },
};

export default dictionary;
