/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phosphor Icon Library Data & Catalog
 * Comprehensive index of all 1,500+ Phosphor icons with smart categories,
 * room/smart-home synonyms, and instant search algorithms.
 */

export interface PhosphorCategory {
  id: string;
  name: string;
  icon: string;
  icons: string[];
}

export const PHOSPHOR_CATEGORIES: PhosphorCategory[] = [
  { id: "popular", name: "Popular / Home", icon: "Sparkle", icons: ["HouseLine","House","Buildings","Stairs","Armchair","Couch","Bed","Bathtub","Shower","Toilet","CookingPot","ForkKnife","Desktop","Laptop","Television","Lightbulb","LightbulbFilament","Lamp","Plug","Power","Lightning","SolarPanel","BatteryCharging","BatteryFull","BatteryMedium","Thermometer","ThermometerHot","ThermometerCold","Drop","Wind","Fan","AppWindow","Door","DoorOpen","Lock","LockOpen","LockKey","Key","Shield","ShieldCheck","ShieldWarning","Bell","BellRinging","Siren","VideoCamera","Webcam","Broom","SpeakerHigh","SpeakerLow","MusicNote","MusicNotes","Car","CarProfile","Bicycle","Garage","Sun","Moon","Cloud","CloudRain","Snowflake","Fire","Gauge","SlidersHorizontal","Tag","Sparkle","Heartbeat","WifiHigh","Compass","Tree","Plant","FilmSlate","Coffee","Books"] },
  { id: "home", name: "Home & Living", icon: "HouseLine", icons: ["House","HouseLine","HouseSimple","Buildings","Stairs","Armchair","Couch","Bed","Bathtub","Shower","Toilet","CookingPot","ForkKnife","BowlFood","Oven","Coffee","TeaBag","Wine","BeerBottle","Door","DoorOpen","AppWindow","Lamp","Desk","Books","BookOpen","CoatHanger","TShirt","Pants","Sneaker","Clock","ClockClockwise","Hourglass","Plant","Flower","Tree","FlowerLotus","PottedPlant","Trash","Broom","PaintBrush","Wrench","Hammer","Screwdriver","Garage","SwimmingPool","WashingMachine","Package","Archive","Fan","Wall","PicnicTable","Rug","Towel"] },
  { id: "devices", name: "Devices & Tech", icon: "Desktop", icons: ["Desktop","DesktopTower","Laptop","DeviceMobile","DeviceMobileCamera","DeviceMobileSpeaker","DeviceTablet","DeviceTabletCamera","DeviceTabletSpeaker","Devices","Monitor","Television","SpeakerHigh","SpeakerLow","SpeakerSimpleHigh","Headphones","Headset","Microphone","VideoCamera","Webcam","Camera","CameraRotate","SecurityCamera","WifiHigh","WifiMedium","WifiLow","WifiSlash","WifiNone","HardDrives","HardDrive","Database","Cpu","Memory","Printer","Scan","QrCode","Barcode","GameController","Watch","Robot","Circuitry","Plug","PlugCharging","Broadcast","Radio","SimCard","Mouse","Keyboard","VirtualReality"] },
  { id: "climate", name: "Climate & Weather", icon: "Thermometer", icons: ["Thermometer","ThermometerHot","ThermometerCold","ThermometerSimple","Drop","DropHalf","DropSlash","Wind","Fan","Cloud","CloudSun","CloudMoon","CloudRain","CloudSnow","CloudLightning","CloudFog","Sun","SunHorizon","SunDim","Moon","MoonStars","Snowflake","Fire","FireSimple","Waves","Tornado","Rainbow","Umbrella","Gauge","Sparkle"] },
  { id: "security", name: "Security & Access", icon: "ShieldCheck", icons: ["Shield","ShieldCheck","ShieldWarning","ShieldSlash","ShieldPlus","ShieldStar","Lock","LockOpen","LockKey","LockKeyOpen","Key","KeyReturn","Password","Fingerprint","ScanSmiley","Bell","BellRinging","BellSimple","BellSlash","Siren","Warning","WarningCircle","WarningOctagon","WarningDiamond","Eye","EyeSlash","Detective","PoliceCar","Vault","Lifebuoy","FirstAid","FirstAidKit","FireExtinguisher","VideoCamera","Door","DoorOpen"] },
  { id: "energy", name: "Power & Energy", icon: "Lightning", icons: ["Lightning","LightningSlash","Power","Plug","PlugCharging","BatteryFull","BatteryMedium","BatteryLow","BatteryEmpty","BatteryCharging","BatteryWarning","BatteryPlus","BatteryVerticalFull","SolarPanel","Gauge","Speedometer","Cpu","ChargingStation","Flashlight","Lightbulb","LightbulbFilament","Sun","Flame","Circuitry"] },
  { id: "mobility", name: "Mobility & Transit", icon: "Car", icons: ["Car","CarProfile","CarSimple","Bicycle","Motorcycle","Bus","Train","TrainRegional","TrainSimple","Airplane","AirplaneTakeoff","AirplaneLanding","AirplaneInFlight","AirplaneTaxiing","Scooter","Moped","Truck","Van","Taxi","GasPump","ChargingStation","NavigationArrow","Compass","MapPin","MapPinSimple","MapTrifold","SteeringWheel","Engine","Tire","RoadHorizon","TrafficSign","TrafficCone","Boat","Anchor"] },
  { id: "media", name: "Media & Audio", icon: "SpeakerHigh", icons: ["SpeakerHigh","SpeakerLow","SpeakerNone","SpeakerSlash","SpeakerSimpleHigh","MusicNote","MusicNotes","MusicNoteSimple","Play","Pause","Stop","PlayPause","FastForward","Rewind","SkipForward","SkipBack","Repeat","RepeatOnce","Shuffle","Playlist","Queue","Television","FilmSlate","FilmStrip","Radio","CassetteTape","Disc","VinylRecord","Headphones","Microphone","Guitar","PianoKeys","Equalizer","Airplay","ProjectorScreen"] },
  { id: "controls", name: "Controls & System", icon: "SlidersHorizontal", icons: ["Sliders","SlidersHorizontal","ToggleLeft","ToggleRight","Check","CheckCircle","CheckSquare","X","XCircle","Plus","PlusCircle","Minus","MinusCircle","ArrowRight","ArrowLeft","ArrowUp","ArrowDown","ArrowsClockwise","ArrowsCounterClockwise","ArrowsIn","ArrowsOut","CaretRight","CaretDown","CaretUp","CaretLeft","Gear","GearSix","Wrench","Pencil","PencilSimple","Trash","MagnifyingGlass","HandPointing","Tag","Bookmark","DotsThree","DotsNine","DotsThreeOutline","SquaresFour","GridNine","Funnel","SortAscending"] },
  { id: "all", name: "All Icons (1,500+)", icon: "SquaresFour", icons: [] }
];

export const ALL_PHOSPHOR_ICONS: string[] = ["Acorn","AddressBook","AddressBookTabs","AirTrafficControl","Airplane","AirplaneInFlight","AirplaneLanding","AirplaneTakeoff","AirplaneTaxiing","AirplaneTilt","Airplay","Alarm","Alien","AlignBottom","AlignBottomSimple","AlignCenterHorizontal","AlignCenterHorizontalSimple","AlignCenterVertical","AlignCenterVerticalSimple","AlignLeft","AlignLeftSimple","AlignRight","AlignRightSimple","AlignTop","AlignTopSimple","AmazonLogo","Ambulance","Anchor","AnchorSimple","AndroidLogo","Angle","AngularLogo","Aperture","AppStoreLogo","AppWindow","AppleLogo","ApplePodcastsLogo","ApproximateEquals","Archive","Armchair","ArrowArcLeft","ArrowArcRight","ArrowBendDoubleUpLeft","ArrowBendDoubleUpRight","ArrowBendDownLeft","ArrowBendDownRight","ArrowBendLeftDown","ArrowBendLeftUp","ArrowBendRightDown","ArrowBendRightUp","ArrowBendUpLeft","ArrowBendUpRight","ArrowCircleDown","ArrowCircleDownLeft","ArrowCircleDownRight","ArrowCircleLeft","ArrowCircleRight","ArrowCircleUp","ArrowCircleUpLeft","ArrowCircleUpRight","ArrowClockwise","ArrowCounterClockwise","ArrowDown","ArrowDownLeft","ArrowDownRight","ArrowElbowDownLeft","ArrowElbowDownRight","ArrowElbowLeft","ArrowElbowLeftDown","ArrowElbowLeftUp","ArrowElbowRight","ArrowElbowRightDown","ArrowElbowRightUp","ArrowElbowUpLeft","ArrowElbowUpRight","ArrowFatDown","ArrowFatLeft","ArrowFatLineDown","ArrowFatLineLeft","ArrowFatLineRight","ArrowFatLineUp","ArrowFatLinesDown","ArrowFatLinesLeft","ArrowFatLinesRight","ArrowFatLinesUp","ArrowFatRight","ArrowFatUp","ArrowLeft","ArrowLineDown","ArrowLineDownLeft","ArrowLineDownRight","ArrowLineLeft","ArrowLineRight","ArrowLineUp","ArrowLineUpLeft","ArrowLineUpRight","ArrowRight","ArrowSquareDown","ArrowSquareDownLeft","ArrowSquareDownRight","ArrowSquareIn","ArrowSquareLeft","ArrowSquareOut","ArrowSquareRight","ArrowSquareUp","ArrowSquareUpLeft","ArrowSquareUpRight","ArrowUDownLeft","ArrowUDownRight","ArrowULeftDown","ArrowULeftUp","ArrowURightDown","ArrowURightUp","ArrowUUpLeft","ArrowUUpRight","ArrowUp","ArrowUpLeft","ArrowUpRight","ArrowsClockwise","ArrowsCounterClockwise","ArrowsDownUp","ArrowsHorizontal","ArrowsIn","ArrowsInCardinal","ArrowsInLineHorizontal","ArrowsInLineVertical","ArrowsInSimple","ArrowsLeftRight","ArrowsMerge","ArrowsOut","ArrowsOutCardinal","ArrowsOutLineHorizontal","ArrowsOutLineVertical","ArrowsOutSimple","ArrowsSplit","ArrowsVertical","Article","ArticleMedium","ArticleNyTimes","Asclepius","Asterisk","AsteriskSimple","At","Atom","Avocado","Axe","Baby","BabyCarriage","Backpack","Backspace","Bag","BagSimple","Balloon","Bandaids","Bank","Barbell","Barcode","Barn","Barricade","Baseball","BaseballCap","BaseballHelmet","Basket","Basketball","Bathtub","BatteryCharging","BatteryChargingVertical","BatteryEmpty","BatteryFull","BatteryHigh","BatteryLow","BatteryMedium","BatteryPlus","BatteryPlusVertical","BatteryVerticalEmpty","BatteryVerticalFull","BatteryVerticalHigh","BatteryVerticalLow","BatteryVerticalMedium","BatteryWarning","BatteryWarningVertical","BeachBall","Beanie","Bed","BeerBottle","BeerStein","BehanceLogo","Bell","BellRinging","BellSimple","BellSimpleRinging","BellSimpleSlash","BellSimpleZ","BellSlash","BellZ","Belt","BezierCurve","Bicycle","Binary","Binoculars","Biohazard","Bird","Blueprint","Bluetooth","BluetoothConnected","BluetoothSlash","BluetoothX","Boat","Bomb","Bone","Book","BookBookmark","BookOpen","BookOpenText","BookOpenUser","Bookmark","BookmarkSimple","Bookmarks","BookmarksSimple","Books","Boot","Boules","BoundingBox","BowlFood","BowlSteam","BowlingBall","BoxArrowDown","BoxArrowUp","BoxingGlove","BracketsAngle","BracketsCurly","BracketsRound","BracketsSquare","Brain","Brandy","Bread","Bridge","Briefcase","BriefcaseMetal","Broadcast","Broom","Browser","Browsers","Bug","BugBeetle","BugDroid","Building","BuildingApartment","BuildingOffice","Buildings","Bulldozer","Bus","Butterfly","CableCar","Cactus","Cake","Calculator","Calendar","CalendarBlank","CalendarCheck","CalendarDot","CalendarDots","CalendarHeart","CalendarMinus","CalendarPlus","CalendarSlash","CalendarStar","CalendarX","CallBell","Camera","CameraPlus","CameraRotate","CameraSlash","Campfire","Car","CarBattery","CarProfile","CarSimple","Cardholder","Cards","CardsThree","CaretCircleDoubleDown","CaretCircleDoubleLeft","CaretCircleDoubleRight","CaretCircleDoubleUp","CaretCircleDown","CaretCircleLeft","CaretCircleRight","CaretCircleUp","CaretCircleUpDown","CaretDoubleDown","CaretDoubleLeft","CaretDoubleRight","CaretDoubleUp","CaretDown","CaretLeft","CaretLineDown","CaretLineLeft","CaretLineRight","CaretLineUp","CaretRight","CaretUp","CaretUpDown","Carrot","CashRegister","CassetteTape","CastleTurret","Cat","CellSignalFull","CellSignalHigh","CellSignalLow","CellSignalMedium","CellSignalNone","CellSignalSlash","CellSignalX","CellTower","Certificate","Chair","Chalkboard","ChalkboardSimple","ChalkboardTeacher","Champagne","ChargingStation","ChartBar","ChartBarHorizontal","ChartDonut","ChartLine","ChartLineDown","ChartLineUp","ChartPie","ChartPieSlice","ChartPolar","ChartScatter","Chat","ChatCentered","ChatCenteredDots","ChatCenteredSlash","ChatCenteredText","ChatCircle","ChatCircleDots","ChatCircleSlash","ChatCircleText","ChatDots","ChatSlash","ChatTeardrop","ChatTeardropDots","ChatTeardropSlash","ChatTeardropText","ChatText","Chats","ChatsCircle","ChatsTeardrop","Check","CheckCircle","CheckFat","CheckSquare","CheckSquareOffset","Checkerboard","Checks","Cheers","Cheese","ChefHat","Cherries","Church","Cigarette","CigaretteSlash","Circle","CircleDashed","CircleHalf","CircleHalfTilt","CircleNotch","CirclesFour","CirclesThree","CirclesThreePlus","Circuitry","City","Clipboard","ClipboardText","Clock","ClockAfternoon","ClockClockwise","ClockCountdown","ClockCounterClockwise","ClockUser","ClosedCaptioning","Cloud","CloudArrowDown","CloudArrowUp","CloudCheck","CloudFog","CloudLightning","CloudMoon","CloudRain","CloudSlash","CloudSnow","CloudSun","CloudWarning","CloudX","Clover","Club","CoatHanger","CodaLogo","Code","CodeBlock","CodeSimple","CodepenLogo","CodesandboxLogo","Coffee","CoffeeBean","Coin","CoinVertical","Coins","Columns","ColumnsPlusLeft","ColumnsPlusRight","Command","Compass","CompassRose","CompassTool","ComputerTower","Confetti","ContactlessPayment","Control","Cookie","CookingPot","Copy","CopySimple","Copyleft","Copyright","CornersIn","CornersOut","Couch","CourtBasketball","Cow","CowboyHat","Cpu","Crane","CraneTower","CreditCard","Cricket","Crop","Cross","Crosshair","CrosshairSimple","Crown","CrownCross","CrownSimple","Cube","CubeFocus","CubeTransparent","CurrencyBtc","CurrencyCircleDollar","CurrencyCny","CurrencyDollar","CurrencyDollarSimple","CurrencyEth","CurrencyEur","CurrencyGbp","CurrencyInr","CurrencyJpy","CurrencyKrw","CurrencyKzt","CurrencyNgn","CurrencyRub","Cursor","CursorClick","CursorText","Cylinder","Database","Desk","Desktop","DesktopTower","Detective","DevToLogo","DeviceMobile","DeviceMobileCamera","DeviceMobileSlash","DeviceMobileSpeaker","DeviceRotate","DeviceTablet","DeviceTabletCamera","DeviceTabletSpeaker","Devices","Diamond","DiamondsFour","DiceFive","DiceFour","DiceOne","DiceSix","DiceThree","DiceTwo","Disc","DiscoBall","DiscordLogo","Divide","Dna","Dog","Door","DoorOpen","Dot","DotOutline","DotsNine","DotsSix","DotsSixVertical","DotsThree","DotsThreeCircle","DotsThreeCircleVertical","DotsThreeOutline","DotsThreeOutlineVertical","DotsThreeVertical","Download","DownloadSimple","Dress","Dresser","DribbbleLogo","Drone","Drop","DropHalf","DropHalfBottom","DropSimple","DropSlash","DropboxLogo","Ear","EarSlash","Egg","EggCrack","Eject","EjectSimple","Elevator","Empty","Engine","Envelope","EnvelopeOpen","EnvelopeSimple","EnvelopeSimpleOpen","Equalizer","Equals","Eraser","EscalatorDown","EscalatorUp","Exam","ExclamationMark","Exclude","ExcludeSquare","Export","Eye","EyeClosed","EyeSlash","Eyedropper","EyedropperSample","Eyeglasses","Eyes","FaceMask","FacebookLogo","Factory","Faders","FadersHorizontal","FalloutShelter","Fan","Farm","FastForward","FastForwardCircle","Feather","FediverseLogo","FigmaLogo","File","FileArchive","FileArrowDown","FileArrowUp","FileAudio","FileC","FileCSharp","FileCloud","FileCode","FileCpp","FileCss","FileCsv","FileDashed","FileDoc","FileHtml","FileImage","FileIni","FileJpg","FileJs","FileJsx","FileLock","FileMagnifyingGlass","FileMd","FileMinus","FilePdf","FilePlus","FilePng","FilePpt","FilePy","FileRs","FileSql","FileSvg","FileText","FileTs","FileTsx","FileTxt","FileVideo","FileVue","FileX","FileXls","FileZip","Files","FilmReel","FilmScript","FilmSlate","FilmStrip","Fingerprint","FingerprintSimple","FinnTheHuman","Fire","FireExtinguisher","FireSimple","FireTruck","FirstAid","FirstAidKit","Fish","FishSimple","Flag","FlagBanner","FlagBannerFold","FlagCheckered","FlagPennant","Flame","Flashlight","Flask","FlipHorizontal","FlipVertical","FloppyDisk","FloppyDiskBack","FlowArrow","Flower","FlowerLotus","FlowerTulip","FlyingSaucer","Folder","FolderDashed","FolderLock","FolderMinus","FolderOpen","FolderPlus","FolderSimple","FolderSimpleDashed","FolderSimpleLock","FolderSimpleMinus","FolderSimplePlus","FolderSimpleStar","FolderSimpleUser","FolderStar","FolderUser","Folders","Football","FootballHelmet","Footprints","ForkKnife","FourK","FrameCorners","FramerLogo","Function","Funnel","FunnelSimple","FunnelSimpleX","FunnelX","GameController","Garage","GasCan","GasPump","Gauge","Gavel","Gear","GearFine","GearSix","GenderFemale","GenderIntersex","GenderMale","GenderNeuter","GenderNonbinary","GenderTransgender","Ghost","Gif","Gift","GitBranch","GitCommit","GitDiff","GitFork","GitMerge","GitPullRequest","GithubLogo","GitlabLogo","GitlabLogoSimple","Globe","GlobeHemisphereEast","GlobeHemisphereWest","GlobeSimple","GlobeSimpleX","GlobeStand","GlobeX","Goggles","Golf","GoodreadsLogo","GoogleCardboardLogo","GoogleChromeLogo","GoogleDriveLogo","GoogleLogo","GooglePhotosLogo","GooglePlayLogo","GooglePodcastsLogo","Gps","GpsFix","GpsSlash","Gradient","GraduationCap","Grains","GrainsSlash","Graph","GraphicsCard","GreaterThan","GreaterThanOrEqual","GridFour","GridNine","Guitar","HairDryer","Hamburger","Hammer","Hand","HandArrowDown","HandArrowUp","HandCoins","HandDeposit","HandEye","HandFist","HandGrabbing","HandHeart","HandPalm","HandPeace","HandPointing","HandSoap","HandSwipeLeft","HandSwipeRight","HandTap","HandWaving","HandWithdraw","Handbag","HandbagSimple","HandsClapping","HandsPraying","Handshake","HardDrive","HardDrives","HardHat","Hash","HashStraight","HeadCircuit","Headlights","Headphones","Headset","Heart","HeartBreak","HeartHalf","HeartStraight","HeartStraightBreak","Heartbeat","Hexagon","HighDefinition","HighHeel","Highlighter","HighlighterCircle","Hockey","Hoodie","Horse","Hospital","Hourglass","HourglassHigh","HourglassLow","HourglassMedium","HourglassSimple","HourglassSimpleHigh","HourglassSimpleLow","HourglassSimpleMedium","House","HouseLine","HouseSimple","Hurricane","IceCream","IdentificationBadge","IdentificationCard","Image","ImageBroken","ImageSquare","Images","ImagesSquare","Infinity","Info","InstagramLogo","Intersect","IntersectSquare","IntersectThree","Intersection","Invoice","Island","Jar","JarLabel","Jeep","Joystick","Kanban","Key","KeyReturn","Keyboard","Keyhole","Knife","Ladder","LadderSimple","Lamp","LampPendant","Laptop","Lasso","LastfmLogo","Layout","Leaf","Lectern","Lego","LegoSmiley","LessThan","LessThanOrEqual","LetterCircleH","LetterCircleP","LetterCircleV","Lifebuoy","Lightbulb","LightbulbFilament","Lighthouse","Lightning","LightningA","LightningSlash","LineSegment","LineSegments","LineVertical","Link","LinkBreak","LinkSimple","LinkSimpleBreak","LinkSimpleHorizontal","LinkSimpleHorizontalBreak","LinkedinLogo","LinktreeLogo","LinuxLogo","List","ListBullets","ListChecks","ListDashes","ListHeart","ListMagnifyingGlass","ListNumbers","ListPlus","ListStar","Lock","LockKey","LockKeyOpen","LockLaminated","LockLaminatedOpen","LockOpen","LockSimple","LockSimpleOpen","Lockers","Log","MagicWand","Magnet","MagnetStraight","MagnifyingGlass","MagnifyingGlassMinus","MagnifyingGlassPlus","Mailbox","MapPin","MapPinArea","MapPinLine","MapPinPlus","MapPinSimple","MapPinSimpleArea","MapPinSimpleLine","MapTrifold","MarkdownLogo","MarkerCircle","Martini","MaskHappy","MaskSad","MastodonLogo","MathOperations","MatrixLogo","Medal","MedalMilitary","MediumLogo","Megaphone","MegaphoneSimple","MemberOf","Memory","MessengerLogo","MetaLogo","Meteor","Metronome","Microphone","MicrophoneSlash","MicrophoneStage","Microscope","MicrosoftExcelLogo","MicrosoftOutlookLogo","MicrosoftPowerpointLogo","MicrosoftTeamsLogo","MicrosoftWordLogo","Minus","MinusCircle","MinusSquare","Money","MoneyWavy","Monitor","MonitorArrowUp","MonitorPlay","Moon","MoonStars","Moped","MopedFront","Mosque","Motorcycle","Mountains","Mouse","MouseLeftClick","MouseMiddleClick","MouseRightClick","MouseScroll","MouseSimple","MusicNote","MusicNoteSimple","MusicNotes","MusicNotesMinus","MusicNotesPlus","MusicNotesSimple","NavigationArrow","Needle","Network","NetworkSlash","NetworkX","Newspaper","NewspaperClipping","NotEquals","NotMemberOf","NotSubsetOf","NotSupersetOf","Notches","Note","NoteBlank","NotePencil","Notebook","Notepad","Notification","NotionLogo","NuclearPlant","NumberCircleEight","NumberCircleFive","NumberCircleFour","NumberCircleNine","NumberCircleOne","NumberCircleSeven","NumberCircleSix","NumberCircleThree","NumberCircleTwo","NumberCircleZero","NumberEight","NumberFive","NumberFour","NumberNine","NumberOne","NumberSeven","NumberSix","NumberSquareEight","NumberSquareFive","NumberSquareFour","NumberSquareNine","NumberSquareOne","NumberSquareSeven","NumberSquareSix","NumberSquareThree","NumberSquareTwo","NumberSquareZero","NumberThree","NumberTwo","NumberZero","Numpad","Nut","NyTimesLogo","Octagon","OfficeChair","Onigiri","OpenAiLogo","Option","Orange","OrangeSlice","Oven","Package","PaintBrush","PaintBrushBroad","PaintBrushHousehold","PaintBucket","PaintRoller","Palette","Panorama","Pants","PaperPlane","PaperPlaneRight","PaperPlaneTilt","Paperclip","PaperclipHorizontal","Parachute","Paragraph","Parallelogram","Park","Password","Path","PatreonLogo","Pause","PauseCircle","PawPrint","PaypalLogo","Peace","Pen","PenNib","PenNibStraight","Pencil","PencilCircle","PencilLine","PencilRuler","PencilSimple","PencilSimpleLine","PencilSimpleSlash","PencilSlash","Pentagon","Pentagram","Pepper","Percent","Person","PersonArmsSpread","PersonSimple","PersonSimpleBike","PersonSimpleCircle","PersonSimpleHike","PersonSimpleRun","PersonSimpleSki","PersonSimpleSnowboard","PersonSimpleSwim","PersonSimpleTaiChi","PersonSimpleThrow","PersonSimpleWalk","Perspective","Phone","PhoneCall","PhoneDisconnect","PhoneIncoming","PhoneList","PhoneOutgoing","PhonePause","PhonePlus","PhoneSlash","PhoneTransfer","PhoneX","PhosphorLogo","Pi","PianoKeys","PicnicTable","PictureInPicture","PiggyBank","Pill","PingPong","PintGlass","PinterestLogo","Pinwheel","Pipe","PipeWrench","PixLogo","Pizza","Placeholder","Planet","Plant","Play","PlayCircle","PlayPause","Playlist","Plug","PlugCharging","Plugs","PlugsConnected","Plus","PlusCircle","PlusMinus","PlusSquare","PokerChip","PoliceCar","Polygon","Popcorn","Popsicle","PottedPlant","Power","Prescription","Presentation","PresentationChart","Printer","Prohibit","ProhibitInset","ProjectorScreen","ProjectorScreenChart","Pulse","PushPin","PushPinSimple","PushPinSimpleSlash","PushPinSlash","PuzzlePiece","QrCode","Question","QuestionMark","Queue","Quotes","Rabbit","Racquet","Radical","Radio","RadioButton","Radioactive","Rainbow","RainbowCloud","Ranking","ReadCvLogo","Receipt","ReceiptX","Record","Rectangle","RectangleDashed","Recycle","RedditLogo","Repeat","RepeatOnce","ReplitLogo","Resize","Rewind","RewindCircle","RoadHorizon","Robot","Rocket","RocketLaunch","Rows","RowsPlusBottom","RowsPlusTop","Rss","RssSimple","Rug","Ruler","Sailboat","Scales","Scan","ScanSmiley","Scissors","Scooter","Screencast","Screwdriver","Scribble","ScribbleLoop","Scroll","Seal","SealCheck","SealPercent","SealQuestion","SealWarning","Seat","Seatbelt","SecurityCamera","Selection","SelectionAll","SelectionBackground","SelectionForeground","SelectionInverse","SelectionPlus","SelectionSlash","Shapes","Share","ShareFat","ShareNetwork","Shield","ShieldCheck","ShieldCheckered","ShieldChevron","ShieldPlus","ShieldSlash","ShieldStar","ShieldWarning","ShippingContainer","ShirtFolded","ShootingStar","ShoppingBag","ShoppingBagOpen","ShoppingCart","ShoppingCartSimple","Shovel","Shower","Shrimp","Shuffle","ShuffleAngular","ShuffleSimple","Sidebar","SidebarSimple","Sigma","SignIn","SignOut","Signature","Signpost","SimCard","Siren","SketchLogo","SkipBack","SkipBackCircle","SkipForward","SkipForwardCircle","Skull","SkypeLogo","SlackLogo","Sliders","SlidersHorizontal","Slideshow","Smiley","SmileyAngry","SmileyBlank","SmileyMeh","SmileyMelting","SmileyNervous","SmileySad","SmileySticker","SmileyWink","SmileyXEyes","SnapchatLogo","Sneaker","SneakerMove","Snowflake","SoccerBall","Sock","SolarPanel","SolarRoof","SortAscending","SortDescending","SoundcloudLogo","Spade","Sparkle","SpeakerHifi","SpeakerHigh","SpeakerLow","SpeakerNone","SpeakerSimpleHigh","SpeakerSimpleLow","SpeakerSimpleNone","SpeakerSimpleSlash","SpeakerSimpleX","SpeakerSlash","SpeakerX","Speedometer","Sphere","Spinner","SpinnerBall","SpinnerGap","Spiral","SplitHorizontal","SplitVertical","SpotifyLogo","SprayBottle","Square","SquareHalf","SquareHalfBottom","SquareLogo","SquareSplitHorizontal","SquareSplitVertical","SquaresFour","Stack","StackMinus","StackOverflowLogo","StackPlus","StackSimple","Stairs","Stamp","StandardDefinition","Star","StarAndCrescent","StarFour","StarHalf","StarOfDavid","SteamLogo","SteeringWheel","Steps","Stethoscope","Sticker","Stool","Stop","StopCircle","Storefront","Strategy","StripeLogo","Student","SubsetOf","SubsetProperOf","Subtitles","SubtitlesSlash","Subtract","SubtractSquare","Subway","Suitcase","SuitcaseRolling","SuitcaseSimple","Sun","SunDim","SunHorizon","Sunglasses","SupersetOf","SupersetProperOf","Swap","Swatches","SwimmingPool","Sword","Synagogue","Syringe","TShirt","Table","Tabs","Tag","TagChevron","TagSimple","Target","Taxi","TeaBag","TelegramLogo","Television","TelevisionSimple","TennisBall","Tent","Terminal","TerminalWindow","TestTube","TextAUnderline","TextAa","TextAlignCenter","TextAlignJustify","TextAlignLeft","TextAlignRight","TextB","TextColumns","TextH","TextHFive","TextHFour","TextHOne","TextHSix","TextHThree","TextHTwo","TextIndent","TextItalic","TextOutdent","TextStrikethrough","TextSubscript","TextSuperscript","TextT","TextTSlash","TextUnderline","Textbox","Thermometer","ThermometerCold","ThermometerHot","ThermometerSimple","ThreadsLogo","ThreeD","ThumbsDown","ThumbsUp","Ticket","TidalLogo","TiktokLogo","Tilde","Timer","TipJar","Tipi","Tire","ToggleLeft","ToggleRight","Toilet","ToiletPaper","Toolbox","Tooth","Tornado","Tote","ToteSimple","Towel","Tractor","Trademark","TrademarkRegistered","TrafficCone","TrafficSign","TrafficSignal","Train","TrainRegional","TrainSimple","Tram","Translate","Trash","TrashSimple","Tray","TrayArrowDown","TrayArrowUp","TreasureChest","Tree","TreeEvergreen","TreePalm","TreeStructure","TreeView","TrendDown","TrendUp","Triangle","TriangleDashed","Trolley","TrolleySuitcase","Trophy","Truck","TruckTrailer","TumblrLogo","TwitchLogo","TwitterLogo","Umbrella","UmbrellaSimple","Union","Unite","UniteSquare","Upload","UploadSimple","Usb","User","UserCheck","UserCircle","UserCircleCheck","UserCircleDashed","UserCircleGear","UserCircleMinus","UserCirclePlus","UserFocus","UserGear","UserList","UserMinus","UserPlus","UserRectangle","UserSound","UserSquare","UserSwitch","Users","UsersFour","UsersThree","Van","Vault","VectorThree","VectorTwo","Vibrate","Video","VideoCamera","VideoCameraSlash","VideoConference","Vignette","VinylRecord","VirtualReality","Virus","Visor","Voicemail","Volleyball","Wall","Wallet","Warehouse","Warning","WarningCircle","WarningDiamond","WarningOctagon","WashingMachine","Watch","WaveSawtooth","WaveSine","WaveSquare","WaveTriangle","Waveform","WaveformSlash","Waves","Webcam","WebcamSlash","WebhooksLogo","WechatLogo","WhatsappLogo","Wheelchair","WheelchairMotion","WifiHigh","WifiLow","WifiMedium","WifiNone","WifiSlash","WifiX","Wind","Windmill","WindowsLogo","Wine","Wrench","X","XCircle","XLogo","XSquare","Yarn","YinYang","YoutubeLogo"];

// Fast set for O(1) membership check
export const PHOSPHOR_ICON_SET = new Set<string>(ALL_PHOSPHOR_ICONS);

// Case-insensitive lookup map to normalize any casing to valid PascalCase
export const PHOSPHOR_LOWERCASE_MAP = new Map<string, string>();
for (const icon of ALL_PHOSPHOR_ICONS) {
  PHOSPHOR_LOWERCASE_MAP.set(icon.toLowerCase(), icon);
}

/**
 * Common home automation and room synonyms to make searching intuitive
 */
export const ICON_SYNONYMS: Record<string, string[]> = {
  "living room": ["Armchair", "Couch", "Television", "Lamp", "Rug", "Flame", "Fire"],
  "living": ["Armchair", "Couch", "Television", "Lamp"],
  "lounge": ["Armchair", "Couch", "Television"],
  "sofa": ["Armchair", "Couch"],
  "couch": ["Armchair", "Couch"],
  "kitchen": ["CookingPot", "ForkKnife", "Oven", "Coffee", "BowlFood", "Wine"],
  "cooking": ["CookingPot", "ForkKnife", "Oven"],
  "fridge": ["Package", "Archive"],
  "refrigerator": ["Package", "Archive"],
  "bedroom": ["Bed", "Clock", "Lamp", "Door", "AppWindow"],
  "bed": ["Bed"],
  "sleep": ["Bed", "Moon", "MoonStars"],
  "bathroom": ["Bathtub", "Shower", "Toilet", "Drop", "Waves", "Towel"],
  "bath": ["Bathtub", "Shower", "Toilet"],
  "shower": ["Shower", "Bathtub", "Drop"],
  "toilet": ["Toilet"],
  "restroom": ["Toilet", "Bathtub"],
  "office": ["Desktop", "Laptop", "Desk", "Books", "Chair", "Printer"],
  "desk": ["Desk", "Desktop", "Laptop"],
  "study": ["Books", "Desk", "Lamp"],
  "garage": ["Garage", "Car", "Bicycle", "Wrench", "Toolbox"],
  "hallway": ["Stairs", "Door", "HouseLine", "DoorOpen"],
  "corridor": ["Stairs", "DoorOpen"],
  "entrance": ["Door", "DoorOpen", "Key", "BellRinging"],
  "patio": ["PicnicTable", "Tree", "Plant", "Sun", "Campfire"],
  "garden": ["Plant", "Flower", "Tree", "PottedPlant", "FlowerLotus"],
  "backyard": ["Tree", "Plant", "Campfire", "Sun"],
  "balcony": ["AppWindow", "Sun", "Plant"],
  "dining": ["ForkKnife", "Wine", "CookingPot", "BeerBottle"],
  "basement": ["Stairs", "HardDrives", "Archive", "Package"],
  "attic": ["Stairs", "House", "Archive"],
  "stairs": ["Stairs", "Stack", "ArrowsVertical"],
  "floor": ["Stairs", "Buildings", "House", "Stack"],
  "story": ["Stairs", "Buildings"],
  "level": ["Stairs", "Stack", "ArrowsVertical"],
  "tv": ["Television", "Monitor", "Desktop", "FilmSlate"],
  "television": ["Television", "Monitor", "FilmSlate"],
  "display": ["Monitor", "Desktop", "Television"],
  "ac": ["Fan", "Wind", "ThermometerCold", "Snowflake"],
  "air": ["Wind", "Fan", "ThermometerCold"],
  "air conditioner": ["Fan", "Wind", "ThermometerCold", "Snowflake"],
  "cooling": ["Fan", "Snowflake", "ThermometerCold", "Wind"],
  "heater": ["Fire", "FireSimple", "ThermometerHot", "Flame"],
  "heating": ["Fire", "FireSimple", "ThermometerHot"],
  "heat": ["Fire", "ThermometerHot"],
  "radiator": ["Fire", "ThermometerHot"],
  "light": ["Lightbulb", "LightbulbFilament", "Lamp", "Sun", "Sparkle", "Flashlight"],
  "lights": ["Lightbulb", "LightbulbFilament", "Lamp"],
  "lamp": ["Lamp", "Lightbulb"],
  "bulb": ["Lightbulb", "LightbulbFilament"],
  "switch": ["Plug", "ToggleRight", "ToggleLeft", "Power"],
  "socket": ["Plug", "Power", "PlugCharging"],
  "outlet": ["Plug", "Power"],
  "plug": ["Plug", "PlugCharging", "Power"],
  "power": ["Power", "Lightning", "BatteryCharging", "Plug"],
  "camera": ["VideoCamera", "Webcam", "Camera", "SecurityCamera"],
  "cctv": ["VideoCamera", "SecurityCamera", "Webcam"],
  "webcam": ["Webcam", "VideoCamera"],
  "security": ["Shield", "ShieldCheck", "ShieldWarning", "Lock", "Siren", "Bell", "SecurityCamera"],
  "lock": ["Lock", "LockOpen", "LockKey", "LockKeyOpen", "Key"],
  "door": ["Door", "DoorOpen", "HouseLine"],
  "window": ["AppWindow", "SidebarSimple", "Columns"],
  "blinds": ["SidebarSimple", "Columns", "AppWindow"],
  "curtain": ["SidebarSimple", "Columns", "AppWindow"],
  "vacuum": ["Broom", "Robot"],
  "clean": ["Broom", "Sparkle"],
  "speaker": ["SpeakerHigh", "SpeakerLow", "SpeakerSimpleHigh", "MusicNote"],
  "audio": ["SpeakerHigh", "MusicNotes", "Headphones", "Radio"],
  "music": ["MusicNote", "MusicNotes", "SpeakerHigh", "VinylRecord", "Headphones"],
  "sensor": ["Gauge", "Speedometer", "ChartLineUp", "Broadcast", "Eye"],
  "motion": ["PersonSimpleWalk", "PersonSimpleRun", "Eye", "Waves"],
  "presence": ["PersonSimpleWalk", "HouseLine", "User", "Users"],
  "leak": ["Drop", "DropHalf", "Waves", "Warning"],
  "water": ["Drop", "Waves", "Shower", "Bathtub"],
  "temp": ["Thermometer", "ThermometerHot", "ThermometerCold"],
  "temperature": ["Thermometer", "ThermometerHot", "ThermometerCold", "ThermometerSimple"],
  "humidity": ["Drop", "DropHalf", "Wind"],
  "battery": ["BatteryFull", "BatteryMedium", "BatteryLow", "BatteryCharging", "BatteryWarning"],
  "solar": ["SolarPanel", "Sun", "Lightning"],
  "network": ["WifiHigh", "Globe", "Broadcast", "HardDrives"],
  "wifi": ["WifiHigh", "WifiMedium", "Broadcast"],
  "car": ["Car", "CarProfile", "CarSimple", "GasPump", "ChargingStation"],
  "ev": ["Car", "ChargingStation", "Lightning", "BatteryCharging"],
  "vehicle": ["Car", "CarProfile", "Bicycle", "Motorcycle", "Truck"],
  "bike": ["Bicycle", "Motorcycle"],
  "bicycle": ["Bicycle"],
  "tag": ["Tag", "Bookmark", "Hash"],
  "label": ["Tag", "Bookmark", "Hash"],
  "zone": ["MapPin", "Compass", "MapTrifold", "Globe"]
};

/**
 * Search all Phosphor icons with smart weighting, category filtering, and synonym expansion.
 */
export function searchPhosphorIcons(query: string, categoryId: string = "popular"): string[] {
  const cleanQ = query.trim().toLowerCase();
  
  // Base pool of icons based on category
  let baseIcons: string[] = ALL_PHOSPHOR_ICONS;
  if (categoryId && categoryId !== "all") {
    const cat = PHOSPHOR_CATEGORIES.find(c => c.id === categoryId);
    if (cat && cat.icons.length > 0) {
      baseIcons = cat.icons;
    }
  }

  // If query is empty, return base icons for that category
  if (!cleanQ) {
    return baseIcons;
  }

  // Find synonym matches
  const synonymIcons = new Set<string>();
  for (const [kw, matches] of Object.entries(ICON_SYNONYMS)) {
    if (kw === cleanQ || cleanQ.includes(kw) || kw.includes(cleanQ)) {
      for (const m of matches) {
        if (PHOSPHOR_ICON_SET.has(m)) {
          synonymIcons.add(m);
        }
      }
    }
  }

  // Score and group matches
  const exact: string[] = [];
  const startsWith: string[] = [];
  const contains: string[] = [];
  const synonymMatches: string[] = [];

  // When searching with a query, search across ALL icons so users never miss an icon
  for (const name of ALL_PHOSPHOR_ICONS) {
    const lower = name.toLowerCase();
    if (lower === cleanQ) {
      exact.push(name);
    } else if (lower.startsWith(cleanQ)) {
      startsWith.push(name);
    } else if (lower.includes(cleanQ)) {
      contains.push(name);
    } else if (synonymIcons.has(name)) {
      synonymMatches.push(name);
    }
  }

  return Array.from(new Set([...exact, ...startsWith, ...contains, ...synonymMatches]));
}

/**
 * Normalizes any icon name string into a valid PascalCase Phosphor Icon Name.
 * Strips mdi:, ph:, dashes, underscores, spaces, and handles case-insensitivity.
 */
export function normalizePhosphorIconName(rawName?: string | null): string | null {
  if (!rawName) return null;
  let clean = rawName.trim();
  if (!clean) return null;

  // Strip prefixes
  if (clean.startsWith("mdi:")) clean = clean.slice(4);
  if (clean.startsWith("ph:")) clean = clean.slice(3);
  if (clean.startsWith("fa:")) clean = clean.slice(3);

  // Remove spaces, hyphens, underscores
  clean = clean.replace(/[\s_\-]/g, "");

  // Exact match in set?
  if (PHOSPHOR_ICON_SET.has(clean)) {
    return clean;
  }

  // Case-insensitive lookup
  const matched = PHOSPHOR_LOWERCASE_MAP.get(clean.toLowerCase());
  if (matched) {
    return matched;
  }

  return clean;
}
