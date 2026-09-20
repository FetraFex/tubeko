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
        termsconditions: "Terms & conditions | Privacy Policy"

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
        termsconditions: "Fitsipika mifehy ny tranonkala"
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
        termsconditions: "Conditions générales | Politique de confidentialité"
    },
};

export default dictionary;
