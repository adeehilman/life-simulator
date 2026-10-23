# FEATURE MAP: Life Simulator (clean-room)

Dokumen ini dibuat dari **nama class** (tanpa isi fungsi, tanpa data konten) hasil ekspor `ExportedProject`. Hanya nama dan pengelompokan yang dipakai sebagai daftar *fitur yang mungkin ada*. Skema TypeScript yang dibuat darinya memakai penamaan sendiri.

## Fakta hasil scan

- Class berawalan `Data*` di `Assembly-CSharp`: **429**. Angka 858 yang saya sebut sebelumnya salah: itu menghitung file `.meta` juga.
- Total file `.cs` kode game (tanpa `.meta`): **6.033**. Sebanyak 4.034 ada di level root dan tidak berawalan `Data` (Scenario* 2.711, Sim* 351, Mini* 166, Fight* 55, dll.).
- Tidak ada enum yang terlihat (semua script berupa kerangka kosong), jadi daftar nilai enum (tipe pekerjaan, penyakit, trait, dst.) **tidak bisa** diambil dari sumber ini.
- Arsitektur yang terbaca dari namespace: engine data-driven bernama *Genesis* (`GenesisEntityDefinition`, `GenesisFeatureContainer`, `GenesisBlueprintChainExecutor`, `ScenarioController`, `CsvDownloader`), `Life`/`LifeLog` sebagai log riwayat, `Sim*` sebagai entitas runtime, `Data*` sebagai pool konten, `Scenario*` sebagai skenario pilihan, `Mini*` sebagai minigame.

## Ringkasan modul

| # | Modul | Jumlah class Data* |
|---|---|---|
| 1. | Core Stats & Character Attributes | 16 |
| 2. | Education & Schooling | 16 |
| 3.1 | Standard Careers & Workplace | 22 |
| 3.2 | Actor | 26 |
| 3.3 | Astronaut | 35 |
| 3.4 | Music | 20 |
| 3.5 | Sports & Martial Arts | 19 |
| 3.6 | Business Owner | 14 |
| 3.7 | Politician | 7 |
| 3.8 | Mafia | 18 |
| 3.9 | Landlord & Property Management | 23 |
| 3.10 | Hustler & Street Dealer | 26 |
| 3.11 | Royalty | 14 |
| 3.12 | Social Media & Influencer | 10 |
| 4.1 | Real Estate | 3 |
| 4.2 | Vehicles | 4 |
| 4.3 | Aircraft | 3 |
| 4.4 | Watercraft | 4 |
| 4.5 | Luxury & Collectibles | 9 |
| 4.6 | Finance & Investments | 18 |
| 5.1 | Romance, Dating & Marriage | 18 |
| 5.2 | Family, Children & Adoption | 13 |
| 5.3 | Pets & Animals | 11 |
| 5.4 | Friends & Social Circle | 8 |
| 6.1 | Black Market & Underground Economy | 18 |
| 6.2 | Prison | 10 |
| 6.3 | Crime & Violence | 10 |
| 7. | Health, Diseases, Addictions & Treatments | 12 |
| 8.1 | Dumb-Choice (Mini-Decision) Scenarios | 4 |
| 8.2 | Spiritual & Prayer | 3 |
| 8.3 | Random Events & Time Machine | 8 |
| 8.4 | Supernatural & Occult | 7 |
| | **Total** | **429** |


---

## 1. Core Stats & Character Attributes

Identitas, tampilan, kosakata nama, kelahiran sampai kematian.

**Class Data\*** (16): `Accessory`, `AccessoryHeadwear`, `AccessoryMask`, `AccessorySunglasses`, `Biography`, `Book`, `CityRegion`, `Country`, `GenderScenario`, `Magazine`, `Name`, `Pastime`, `SexualityScenario`, `UsernameAdjective`, `UsernameNoun`, `UsernameStructure`

**Entitas runtime (Sim\*) terkait:** SimHero, SimPerson, SimPersonName, SimPast, SimDeath, SimWill, SimAncestor, SimFame, SimDestinyEvent, SimEmigration, SimWorld, SimPlace


---

## 2. Education & Schooling

Sekolah, kampus, klik/frat, perilaku kelas, ujian lisensi.

**Class Data\*** (16): `BullyScenario`, `College`, `LicenseBoatQuestion`, `LicenseCarQuestion`, `LicensePlaneQuestion`, `SchoolActUpScenario`, `SchoolActivity`, `SchoolClassmateFlirtScenario`, `SchoolClassmateMessScenario`, `SchoolClique`, `SchoolFrat`, `SchoolFratQuestion`, `SchoolPrincipalWarning`, `SchoolTeacherCallOut`, `SchoolTeacherDisrespect`, `SchoolTeacherSuckup`

**Entitas runtime (Sim\*) terkait:** SimSchool, SimSchoolActivity, SimSchoolClique, SimSchoolFrat, SimClassmate, SimTeacher, SimOccupationStudent


---

## 3. Standard Careers & Special / Active Careers

Karier pasif (gaji) dan karier aktif dengan sub-sistem sendiri.

### 3.1 Standard Careers & Workplace (22)

**Class Data\*:** `Career`, `CoworkerAnnoyScenario`, `CoworkerBehaviorScenario`, `CoworkerHookupScenario`, `CoworkerPrank`, `CoworkerRumor`, `EmployeeBehaviorBadScenario`, `EmployeeBehaviorGoodScenario`, `EmployeeDisrespectScenario`, `EmployeeInterviewQuestion`, `EmployeeRecognitionScenario`, `EmployeeRespectScenario`, `EmployeeType`, `EmployeeWarnScenario`, `InterviewAnswer`, `InterviewQuestion`, `MilitaryRank`, `PartTimeJob`, `SupervisorUnprofessionalScenario`, `SupervisorWarning`, `TerminationScenario`, `WarScenario`

**Entitas runtime (Sim\*) terkait:** SimJob, SimOccupation, SimOccupationEmployee, SimOccupationMilitary, SimOccupationSpecial, SimCoworker, SimWorkplace, SimPartTimeJob, SimPartTimeFreelance, SimWar

### 3.2 Actor (26)

**Class Data\*:** `ActorAgentDropsHeroColor`, `ActorAgentFireColor`, `ActorAgentHireColor`, `ActorCostarCrazyScenario`, `ActorCostarCriticismScenario`, `ActorCostarDissScenario`, `ActorCostarNervousScenario`, `ActorDevelopCharacterScenario`, `ActorDynamicChallenge`, `ActorExtraRole`, `ActorFilm`, `ActorFilmCriticColor`, `ActorFilmGenre`, `ActorPracticeScenario`, `ActorPublicityStuntScenario`, `ActorReal`, `ActorRejectionColor`, `ActorShow`, `ActorShowGenre`, `ActorSpeechColor`, `ActorStudioFireColor`, `AuditionRejectionColor`, `Celebrity`, `DumbScenarioActor`, `Movie`, `PaparazziScenario`

**Entitas runtime (Sim\*) terkait:** SimActorFilm, SimActorShow, SimActorFilmRole, SimActorAward, SimBookingAgent, SimCostar, SimCommercial, SimTalkShowOpportunity, SimSpecialJobActor

### 3.3 Astronaut (35)

**Class Data\*:** `AstronautAnxietyScenario`, `AstronautArtifact`, `AstronautAsteroid`, `AstronautBlackHole`, `AstronautCareerRank`, `AstronautCelestialBodyName`, `AstronautComet`, `AstronautConversation`, `AstronautCountries`, `AstronautDirectorWarning`, `AstronautExperimentScenario`, `AstronautFitnessTraining`, `AstronautFlightScenario`, `AstronautGalaxy`, `AstronautInboundMessage`, `AstronautLunarMission`, `AstronautMarsDestination`, `AstronautMartianMission`, `AstronautMissionGoofOff`, `AstronautMoonDestination`, `AstronautNebulaShape`, `AstronautOutboundMessage`, `AstronautPeerReviewColor`, `AstronautPlanet`, `AstronautPrank`, `AstronautProbeName`, `AstronautPublicationTitle`, `AstronautSatelliteName`, `AstronautSatellitePart`, `AstronautScannerObservation`, `AstronautShuttleName`, `AstronautStar`, `AstronautTrainingQuestion`, `DumbScenarioAstronaut`, `DumbScenarioAstronautMission`

**Entitas runtime (Sim\*) terkait:** SimAstronaut, SimAstronautAgency, SimAstronautSkills, SimAstronautTrainingProgram, SimSpaceMission, SimSpaceShuttle, SimProbe, SimSpace{Planet,Star,Galaxy,Comet,Asteroid,BlackHole,Nebula,Satellite}, SimTelescopeRecording, SimSpecialJobAstronaut

### 3.4 Music (20)

**Class Data\*:** `DumbScenarioAlbum`, `DumbScenarioMusic`, `MusicAlbumCover`, `MusicAlbumRejection`, `MusicAuditionRejection`, `MusicBandBreakupScenario`, `MusicBandKickOutScenario`, `MusicConcertVenue`, `MusicFanInteractionScenario`, `MusicGenre`, `MusicInstrument`, `MusicNameAlbum`, `MusicNameBand`, `MusicNameCompilation`, `MusicNameSong`, `MusicNameStage`, `MusicPracticeScenario`, `MusicProducerDumbScenarioChoice`, `MusicRole`, `MusicSubgenre`

**Entitas runtime (Sim\*) terkait:** SimMusicBand, SimMusicAlbum, SimBandmate, SimMusicInstrument, SimMusicProfession, SimMusicSoloContract, SimMusicProducer* (Artist/RecordLabel/Track/Promotion), SimSoundCloud*, SimPodcast*, SimBangerzAward*, SimSpecialJobMusician, SimSpecialJobMusicProducer

### 3.5 Sports & Martial Arts (19)

**Class Data\*:** `CustomAttackAction`, `CustomAttackBodyPart`, `DumbScenarioSports`, `MartialArt`, `MartialArtMove`, `RacingRacerName`, `Sport`, `SportsAward`, `SportsCoachScenario`, `SportsFanInteractionScenario`, `SportsInjury`, `SportsLeague`, `SportsPivotalMomentScenario`, `SportsPosition`, `SportsPracticeScenario`, `SportsStat`, `SportsTeam`, `SportsTrainingScenario`, `SportsTrashTalkScenario`

**Entitas runtime (Sim\*) terkait:** SimSportsTeam, SimSportsLeague, SimSportsContract, SimSportsSkill, SimSportsInjury, SimAthleteSeasonStats, SimMartialArt, SimFightClub* (Fighter/Move/Coach/BettingMatch), SimRacing* (Cup/Track/PitCrew/Sponsor), SimRaceCar*, SimSpecialJobAthlete

### 3.6 Business Owner (14)

**Class Data\*:** `BusinessCompetitionFluctuation`, `BusinessConsultantHumor`, `BusinessDemandFluctuation`, `BusinessIndustry`, `BusinessMarketResearch`, `BusinessNameStructure`, `BusinessProduct`, `BusinessProductName`, `BusinessSupplierNameStructure`, `BusinessTeamBuildingActivity`, `BusinessTeamRequestScenario`, `BusinessWriteOffScenario`, `CompanyNameStructure`, `DumbScenarioBusiness`

**Entitas runtime (Sim\*) terkait:** SimBusiness, SimCompany, SimEmployee, SimProduct, SimSupplier, SimCompetitor, SimFacility, SimMarket, SimMarketEvent, SimSectorEvent, SimAnnualReport, SimSpecialJobBusiness

### 3.7 Politician (7)

**Class Data\*:** `CountryPoliticalSystem`, `DumbScenarioPolitical`, `PoliticalBribe`, `PoliticalHeadline`, `PoliticalLaw`, `PoliticalParty`, `PoliticalRumor`

**Entitas runtime (Sim\*) terkait:** SimPoliticalCampaign, SimPoliticalIssue, SimSpecialJobPolitician

### 3.8 Mafia (18)

**Class Data\*:** `DumbScenarioMafia`, `MafiaCallingCard`, `MafiaExcuse`, `MafiaExecution`, `MafiaExtortionTarget`, `MafiaFeedbackEarnings`, `MafiaFeedbackNegative`, `MafiaFeedbackPositive`, `MafiaJoinMethod`, `MafiaJoinRejection`, `MafiaMob`, `MafiaNickname`, `MafiaPastime`, `MafiaPushCrime`, `MafiaPushTarget`, `MafiaScareMethod`, `MafiaShakedownMethod`, `MafiaTemptationScenario`

**Entitas runtime (Sim\*) terkait:** SimMafiaFamily, SimMafiaTarget, SimMafiaInformantCase, SimMobster, SimSpecialJobMafia, SimCasinoMafiaMember

### 3.9 Landlord & Property Management (23)

**Class Data\*:** `DumbScenarioLandlord`, `LandlordAmenityFeedbackScenario`, `LandlordBackgroundCheckColor`, `LandlordHomeDefaultFeature`, `LandlordHomeRemodelFeature`, `LandlordMaintenanceRefusalScenario`, `LandlordMaintenanceRequestScenario`, `LandlordNaturalDisasterScenario`, `LandlordRealEstatePortfolio`, `LandlordSpookedContractorQuitColor`, `LandlordSquatterPushScenario`, `LandlordSquatterReasonColor`, `LandlordTenantBegLowerRentScenario`, `LandlordTenantBegToStayScenario`, `LandlordTenantDamagedPropertyScenario`, `LandlordTenantEmploymentCheck`, `LandlordTenantInspectionColor`, `LandlordTenantLateRentColor`, `LandlordTenantLateRentInsist`, `LandlordTenantLeaveColor`, `LandlordTenantLoverNagsHero`, `LandlordTenantWarnScenario`, `PropertyManagementCompanyName`

**Entitas runtime (Sim\*) terkait:** SimLandlordPortfolio, SimTenant, SimTenantPet, SimPropertyManager, SimPropertyLeaseContract, SimPropertyRemodel

### 3.10 Hustler & Street Dealer (26)

**Class Data\*:** `DumbScenarioDealer`, `DumbScenarioHustler`, `HustlerAttire`, `HustlerBuskMusicType`, `HustlerBuskNegativeScenario`, `HustlerBuskPositiveScenario`, `HustlerBuskRequest`, `HustlerCollectionBox`, `HustlerInsult`, `HustlerPanhandleConfrontationScenario`, `HustlerPanhandleExcuse`, `HustlerPanhandleFood`, `HustlerPanhandleItem`, `HustlerPanhandleProp`, `HustlerPanhandleSign`, `HustlerPanhandleStrategy`, `HustlerPerformAct`, `HustlerPerformDisrespectScenario`, `HustlerPerformRespectScenario`, `HustlerPoliceScenario`, `HustlerScamItem`, `HustlerScamType`, `HustlerScamVictimScenario`, `HustlerSerenadeSong`, `StreetName`, `StreetPerson`

**Entitas runtime (Sim\*) terkait:** SimHustle, SimHustleStreet, SimDealerStreet, SimDealerCartel(Member), SimDealerDrug(Cut), SimDealerSupplyRun, SimDealingExperience, SimStreetPerson, SimSpecialJobHustler, SimSpecialJobDealer

### 3.11 Royalty (14)

**Class Data\*:** `CountryRoyalSystem`, `DumbScenarioRoyal`, `RoyalCelebrityInteractionScenario`, `RoyalCommonerNegativeScenario`, `RoyalCommonerPositiveScenario`, `RoyalExecution`, `RoyalHouseName`, `RoyalPublicDisserviceScenario`, `RoyalPublicServiceScenario`, `RoyalPunishment`, `RoyalReward`, `RoyalSchoolNegativeScenario`, `RoyalSchoolPositiveScenario`, `RoyalTabloidScenario`

**Entitas runtime (Sim\*) terkait:** SimRoyal, SimRoyalPerson

### 3.12 Social Media & Influencer (10)

**Class Data\*:** `SexyTextItem`, `SocialMediaChannel`, `SocialMediaHack`, `SocialMediaOnlyFansCollab`, `SocialMediaOnlyFansTipsReponse`, `SocialMediaPostType`, `SocialMediaPromotionProduct`, `SocialMediaTrollInbound`, `SocialMediaTrollOutbound`, `YouTubeChannel`

**Entitas runtime (Sim\*) terkait:** SimSocialMediaChannel, SimSocialMediaTroll, SimRichSocialMedia, SimModel*, SimModelingAgency(Client), SimSpecialJobModel, SimFashionWeek


---

## 4. Real Estate, Vehicles, Aircraft, Watercraft & Luxury Assets

Aset berwujud dan keuangan.

### 4.1 Real Estate (3)

**Class Data\*:** `GiftRejectionHouse`, `HouseType`, `SpouseHouseReaction`

**Entitas runtime (Sim\*) terkait:** SimHouse, SimPropertyRemodel, SimMuseum(Wing/Floor), SimOutdoor*, SimZoo*, SimCasino*

### 4.2 Vehicles (4)

**Class Data\*:** `CarModel`, `CarPart`, `GiftRejectionVehicle`, `SpouseVehicleReaction`

**Entitas runtime (Sim\*) terkait:** SimCar, SimCarRepair, SimCarSpecialFeature, SimRecreationalVehicle

### 4.3 Aircraft (3)

**Class Data\*:** `Aircraft`, `AircraftDangerScenario`, `AircraftPart`

**Entitas runtime (Sim\*) terkait:** SimAircraft, SimAircraftRepair

### 4.4 Watercraft (4)

**Class Data\*:** `Watercraft`, `WatercraftDangerScenario`, `WatercraftName`, `WatercraftPart`

**Entitas runtime (Sim\*) terkait:** SimWatercraft, SimWatercraftRepair

### 4.5 Luxury & Collectibles (9)

**Class Data\*:** `Gift`, `Heirloom`, `JewelryGemstone`, `JewelryMetal`, `JewelryType`, `NotificationHeirloom`, `VacationCruise`, `VacationDestination`, `WealthyPerson`

**Entitas runtime (Sim\*) terkait:** SimLuxury, SimLuxuryIsland(Structure), SimLuxuryCharity, SimLuxurySecretSociety, SimJewel(Custom), SimHeirloom, SimArtifact, SimAuctionItem, SimDisplayItem

### 4.6 Finance & Investments (18)

**Class Data\*:** `FinancialAdviceRejection`, `FinancialAdvisorDropsHeroColor`, `FinancialAdvisorFireColor`, `FinancialAdvisorHireColor`, `FinancialAssetAdvice`, `FinancialAssetTip`, `FinancialCryptoPerformanceColor`, `FinancialCryptocurrency`, `FinancialFundPerformanceColor`, `FinancialHeadline`, `FinancialInsiderBuyScenario`, `FinancialInsiderSellScenario`, `FinancialMarketAdvice`, `FinancialPortfolioReportColor`, `FinancialStockNameStructure`, `FinancialStockPerformanceColor`, `FinancialStockTipScenario`, `FinancialUniversalStock`

**Entitas runtime (Sim\*) terkait:** SimFinances, SimBankLoan, SimLoan, SimInvestment(Market/AnnualReport), SimPortfolio, SimStock(Sector/Event), SimFund, SimCrypto(Event), SimFinancialAdvisor


---

## 5. Relationships, Family, Adoption & Pets

Hubungan antar-karakter, keluarga, hewan peliharaan.

### 5.1 Romance, Dating & Marriage (18)

**Class Data\*:** `BreakupScenario`, `DateRejection`, `ExLoverBootyCallScenario`, `ExLoverHateScenario`, `ExLoverRekindleScenario`, `ExLoverStalkingScenario`, `FirstKissReaction`, `HookupFeedback`, `HookupScenario`, `LoverCheatScenario`, `LoverMakeLoveNag`, `LoverMarriageNag`, `LoverSuspiciousScenario`, `MakeLoveRejection`, `MoneyRequestRejection`, `ProposalSetting`, `RelationshipCounselingScenario`, `WeddingVenue`

**Entitas runtime (Sim\*) terkait:** SimLover, SimBond, SimPrenuptialAgreement, SimPregnancy

### 5.2 Family, Children & Adoption (13)

**Class Data\*:** `AdoptionReason`, `AdoptionScenario`, `BirthCircumstance`, `ChildBreakItem`, `ChildDemand`, `ChildDiscipline`, `ChildPressureRejection`, `ParentCheatScenario`, `ParentLoverDisapproval`, `SiblingArgument`, `StepparentCrueltyScenario`, `SurrogateRejection`, `SurrogateRunOffScenario`

**Entitas runtime (Sim\*) terkait:** SimParent, SimSibling, SimChild, SimChildSupport, SimOrphanage, SimAdoptionSituation, SimSurrogateSituation, SimSeniorPerson, SimSeniorCenter

### 5.3 Pets & Animals (11)

**Class Data\*:** `Animal`, `Horse`, `PetDeathType`, `PetDiscipline`, `PetDiseaseType`, `PetName`, `PetPastime`, `PetRelease`, `PetReleaseFiller`, `PetTreat`, `PetType`

**Entitas runtime (Sim\*) terkait:** SimPet, SimPetDisease, SimOutdoorAnimal, SimZooAnimal

### 5.4 Friends & Social Circle (8)

**Class Data\*:** `Compliment`, `Conversation`, `FriendAdvice`, `FriendLoverScenario`, `FriendPartyScenario`, `FriendPrank`, `FriendRumor`, `Insult`

**Entitas runtime (Sim\*) terkait:** SimDropDownPerson, SimCommunard


---

## 6. Crime, Prison, Lawsuits & Underground Activities

Kejahatan, penjara, pasar gelap.

### 6.1 Black Market & Underground Economy (18)

**Class Data\*:** `BlackMarketAntique`, `BlackMarketArt`, `BlackMarketAuctionCategory`, `BlackMarketAuctionHouseName`, `BlackMarketAutomobiles`, `BlackMarketBase`, `BlackMarketChemistProductFeedbackColor`, `BlackMarketFashion`, `BlackMarketHistoricalArtifact`, `BlackMarketPoliceIntoxicatedHeroColor`, `BlackMarketPoliceIntoxicatedWarning`, `BlackMarketPurchaseRequest`, `BlackMarketSportsMemorabilia`, `BlackMarketStreetChemistCutIngredient`, `BlackMarketStreetChemistProduct`, `BlackMarketTaxidermistBusinessName`, `BlackMarketTaxidermyDiscardLocation`, `BlackMarketWeapon`

**Entitas runtime (Sim\*) terkait:** SimBlackMarket(Vendor), SimBurgleItem, SimHackingTarget

### 6.2 Prison (10)

**Class Data\*:** `DumbScenarioPrison`, `PrisonBullyInboundScenario`, `PrisonBullyOutboundScenario`, `PrisonGang`, `PrisonGift`, `PrisonJob`, `PrisonLetter`, `PrisonNickname`, `PrisonParoleQuestion`, `PrisonerCrime`

**Entitas runtime (Sim\*) terkait:** SimPrison, SimPrisoner, SimPrisonGang, SimOccupationPrisoner

### 6.3 Crime & Violence (10)

**Class Data\*:** `ArrestScenario`, `Assault`, `BankRobberyDisguise`, `BankRobberyGetawayMethod`, `BankRobberyWeapon`, `DelinquentActivity`, `Hitman`, `Murder`, `StalkerScenario`, `Weapon`

**Entitas runtime (Sim\*) terkait:** SimCrime, SimLawsuitTarget, SimMurderTarget, SimDelinquentAccomplice, SimSecretAgent*, SimSpyAgency*, SimRivalSpyAgency, SimCult(Plot)


---

## 7. Health, Diseases, Addictions & Treatments

Kesehatan fisik, adiksi, perawatan.

**Class Data\*** (12): `Alcohol`, `AlcoholScenario`, `BodyPart`, `DeathType`, `Diet`, `DiseaseSymptomScenario`, `DiseaseType`, `Drug`, `DrugScenario`, `Food`, `FuneralAshLocation`, `PlasticSurgery`

**Entitas runtime (Sim\*) terkait:** SimDisease, SimAddiction, SimDoctor, SimDiet


---

## 8. Random Events, Scenarios & Traits / Supernatural

Event acak dan hal gaib.

### 8.1 Dumb-Choice (Mini-Decision) Scenarios (4)

**Class Data\*:** `DumbScenario`, `DumbScenarioCalendar`, `DumbScenarioChoice`, `DumbScenarioFriend`

### 8.2 Spiritual & Prayer (3)

**Class Data\*:** `PrayAssetScenario`, `PrayFeedback`, `PrayWealthScenario`

### 8.3 Random Events & Time Machine (8)

**Class Data\*:** `Boost`, `HeroFiller`, `Hub`, `NewsEvent`, `NotificationBait`, `NotificationVoice`, `PublicPlace`, `SpecialTalentFiller`

**Entitas runtime (Sim\*) terkait:** SimSectorEvent, SimDiscovery, SimDestinyEvent, SimTotem, SimTransmission

### 8.4 Supernatural & Occult (7)

**Class Data\*:** `Ghost`, `GhostKillTenantScenario`, `ParanormalEncounter`, `ParanormalPhenomenon`, `TimeMachineScenario`, `VampireDumbScenarioChoice`, `WitchRemedy`

**Entitas runtime (Sim\*) terkait:** SimVampire{Coffin,CouncilMember,Familiar,Goal,Hunter,Progeny}, SimGhost, SimCult


---

## Modul lintas-bidang tanpa class `Data*` (terlihat dari nama class lain)

- **Casino & Gambling:** `SimCasino*` (Blackjack, Craps, HighLow, Keno, Roulette, Slots, SportsBetting, TexasHoldEm, ThreeCardShuffle), `SimHorseRacingSession`, minigame Blackjack dan Craps.
- **Zoo Management:** `SimZoo*` (Animal, Habitat, Employee, Attraction, Veterinarian, Supplier, GiftShopItem), 122 class `ScenarioZoo*`.
- **Outdoor / Hobi:** `SimOutdoor*` (Fishing, Camping, OffRoading, Handbook, Plant, Bird, MarineLife).
- **Secret Agent / Spy:** `SimSecretAgent*` (misi Assassination/Hacking/Honeypot/Stealth, Gadget), `SimSpyAgency*`.
- **Cult:** `SimCult`, `SimCultPlot`, 100 class `ScenarioCult*`.
- **Fight Club / Wrestling / Striker:** `SimFightClub*`, `BecomeAStrikerCategory`, `BecomeAWrestlerCategory`, `BecomeASubmissionArtistCategory`.
- **Museum, Island, Secret Society (luxury):** `SimMuseum*`, `SimLuxuryIsland*`, `SimLuxurySecretSociety`.
- **Podcast / SoundCloud:** `SimPodcast*`, `SimSoundCloud*`.
- **Minigame (166 class `MiniGame*`):** Blackjack, Craps, Burglary (maze), CarRace (circuit/demolition/street), slider Business (bonus/payroll/facilities/salary), Astronaut probe launch, EarthDefense, EyeExam, CultTattooPicker.
- **Meta/Platform (di luar cakupan game):** `Backend/*`, `CandyBusiness/*`, `GameAnalyticsSDK`, `CleverTapSDK`, `Gadsme`, `ISAdQualityJSON`, `UnityEngine/Purchasing`, `Tracking`, `Voltron*` (renderer wajah/avatar).

## Usulan tahap pembangunan (untuk dipilih)

1. **Fondasi:** 1, 2, 3.1, 5.1, 5.2, 7, 8.3 (loop usia, statistik, sekolah, karier standar, hubungan, kesehatan, event acak).
2. **Ekonomi:** 4.1, 4.2, 4.6, 4.5, 6.3, 6.2 (aset, finansial, kejahatan, penjara).
3. **Karier aktif (satu per satu):** 3.2 Actor, 3.4 Music, 3.5 Sports, 3.6 Business, 3.7 Politician, 3.9 Landlord, 3.8 Mafia, 3.3 Astronaut, 3.11 Royalty, 3.10 Hustler, 3.12 Social Media.
4. **Ekstra:** 4.3, 4.4, 5.3, 5.4, 6.1, 8.1, 8.2, 8.4, lalu modul lintas-bidang.
