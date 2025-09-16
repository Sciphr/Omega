"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ImageUpload } from "@/components/ui/image-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTournamentSchema } from "@/lib/validations";
import {
  TOURNAMENT_FORMAT,
  TOURNAMENT_TYPE,
  PARTICIPATION_TYPE,
  SEEDING_TYPE,
  MATCH_FORMAT,
  GAME_TEMPLATES,
  DRAFT_TYPES,
  LEAGUE_OF_LEGENDS_CONFIG,
  ROUND_ROBIN_TYPE,
  GROUP_CREATION_METHOD,
} from "@/lib/types";
import { calculateTournamentDuration } from "@/lib/bracket-utils";
import { uploadTournamentImage, getDefaultTournamentImages } from "@/lib/storage";
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Users,
  Settings,
  Gamepad2,
  Clock,
  Shield,
  Target,
} from "lucide-react";

const STEPS = [
  { id: "basic", title: "Basic Info", icon: Trophy },
  { id: "game", title: "Game & Format", icon: Gamepad2 },
  { id: "participants", title: "Participants", icon: Users },
  { id: "settings", title: "Settings", icon: Settings },
];

export function TournamentWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameProfiles, setGameProfiles] = useState([]);
  const [selectedGameProfile, setSelectedGameProfile] = useState(null);
  const [loadingGameProfiles, setLoadingGameProfiles] = useState(true);
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const router = useRouter();
  const { user, session, loading, initialized } = useAuthStore();

  const form = useForm({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      game: "",
      format: TOURNAMENT_FORMAT.SINGLE_ELIMINATION,
      tournamentType: TOURNAMENT_TYPE.INDIVIDUAL,
      teamSize: 1,
      maxParticipants: 16,

      // Game profile specific settings
      gameProfileId: "",
      selectedMap: "",
      draftType: "",
      customPhases: [],

      // League of Legends specific settings
      leagueSettings: {
        map: "summoners_rift",
        draftType: "tournament_draft",
        enableBans: true,
        banPhases: [{ phase: 1, bansPerTeam: 3 }],
        pickPhases: [{ phase: 1, picksPerTeam: 5 }],
        timeLimit: 30,
      },
      participationType: PARTICIPATION_TYPE.ANYONE,
      seedingType: SEEDING_TYPE.RANDOM,
      password: "",
      isPublic: true,
      creatorName: "",
      // Round robin specific settings
      roundRobinType: ROUND_ROBIN_TYPE.SINGLE,
      groupCount: 4,
      groupCreationMethod: GROUP_CREATION_METHOD.SKILL_BALANCED,
      settings: {
        matchFormat: MATCH_FORMAT.BO1,
        allowForfeits: true,
        autoAdvance: false,
        scoreConfirmationRequired: true,
        checkInRequired: false,
        checkInDeadline: null,
        registrationDeadline: null,
        startTime: null,
        rules: "",
        prizeInfo: "",
        enableDraftBan: false,
        draftBanSettings: {
          enableBans: true,
          enableDrafts: true,
          bansPerSide: 3,
          draftsPerSide: 5,
          banTimer: 30,
          draftTimer: 30,
          alternatingOrder: true,
          customPhases: [],
        },
      },
    },
  });

  const watchedValues = form.watch();

  // Computed values
  const currentGame = selectedGameProfile;
  const duration = calculateTournamentDuration(
    watchedValues.maxParticipants,
    watchedValues.format,
    watchedValues.settings?.matchFormat
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/create");
    }
  }, [user, loading, router]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading timeout - forcing show of auth prompt");
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Load game profiles
  useEffect(() => {
    loadGameProfiles();
  }, []);

  const loadGameProfiles = async () => {
    try {
      setLoadingGameProfiles(true);
      const response = await fetch("/api/game-profiles");
      const result = await response.json();

      if (result.success) {
        setGameProfiles(result.profiles);
      } else {
        console.error("Failed to load game profiles:", result.error);
      }
    } catch (error) {
      console.error("Error loading game profiles:", error);
    } finally {
      setLoadingGameProfiles(false);
    }
  };

  // Show loading while checking auth (with timeout)
  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
          <p className="text-xs text-muted-foreground mt-2">
            If this takes too long, try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to create tournaments. This allows you to
            manage participants, start tournaments, and track results.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push("/login?redirect=/create")}>
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/register?redirect=/create")}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const nextStep = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data) => {
    console.log(
      "onSubmit called on step:",
      currentStep,
      "of",
      STEPS.length - 1
    );

    // Only allow submission on the final step
    if (currentStep !== STEPS.length - 1) {
      console.log("Preventing submission - not on final step");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Creating tournament with data:", data);
      console.log("Selected game profile:", selectedGameProfile);
      console.log("Session info:", session);

      if (!session?.access_token) {
        console.error("No access token available. Session:", session);
        throw new Error("No access token available");
      }

      // Handle image uploads
      let thumbnailImageUrl = null;
      let bannerImageUrl = null;

      // Create a temporary tournament ID for image organization
      const tempTournamentId = crypto.randomUUID();

      if (thumbnailImage?.file) {
        console.log("Uploading thumbnail image...");
        const result = await uploadTournamentImage(thumbnailImage.file, tempTournamentId, 'thumbnail');
        if (result.success) {
          thumbnailImageUrl = result.url;
        } else {
          console.error("Thumbnail upload failed:", result.error);
          // Continue without thumbnail - don't fail the tournament creation
        }
      }

      if (bannerImage?.file) {
        console.log("Uploading banner image...");
        const result = await uploadTournamentImage(bannerImage.file, tempTournamentId, 'banner');
        if (result.success) {
          bannerImageUrl = result.url;
        } else {
          console.error("Banner upload failed:", result.error);
          // Continue without banner - don't fail the tournament creation
        }
      }

      // If no custom images, use default images based on the game
      if (!thumbnailImageUrl || !bannerImageUrl) {
        const defaultImages = getDefaultTournamentImages(selectedGameProfile?.game_key || data.game);
        thumbnailImageUrl = thumbnailImageUrl || defaultImages.thumbnailUrl;
        bannerImageUrl = bannerImageUrl || defaultImages.bannerUrl;
      }

      // Transform the data to match API expectations
      const tournamentPayload = {
        ...data,
        game: selectedGameProfile?.game || data.game,
        gameProfileId: selectedGameProfile?.id || data.gameProfileId,
        thumbnailImageUrl,
        bannerImageUrl,
      };

      console.log("Sending tournament payload:", tournamentPayload);

      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tournamentPayload),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);

      if (result.success) {
        console.log("Tournament created successfully:", result.tournament);

        if (onComplete) {
          onComplete(result.tournament);
        } else {
          router.push(result.url || "/tournaments");
        }
      } else {
        console.error("Failed to create tournament:", result.error);
        form.setError("root", { message: result.error });
      }
    } catch (error) {
      console.error("Failed to create tournament:", error);
      form.setError("root", {
        message: "An unexpected error occurred: " + error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Tournament</h1>
          <p className="text-muted-foreground mb-6">Set up your tournament in {STEPS.length} easy steps</p>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <span className="text-sm font-medium">Step {currentStep + 1} of {STEPS.length}</span>
              <span className="text-sm text-muted-foreground font-medium">{STEPS[currentStep].title}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto px-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <div className="ml-1 sm:ml-2 hidden sm:block">
                    <div className={`text-xs font-medium ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mx-1 sm:mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onKeyDown={(e) => {
          // Prevent form submission on Enter key unless on final step
          if (e.key === "Enter" && currentStep !== STEPS.length - 1) {
            e.preventDefault();
          }
        }}
      >
        <Card>
          <CardContent className="p-6">
            {currentStep === 0 && (
              <div className="space-y-8">
                <div className="mb-6">
                  <CardTitle className="text-xl font-semibold mb-2">Basic Information</CardTitle>
                  <CardDescription>
                    Set up your tournament name and description
                  </CardDescription>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name">
                      Tournament Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter tournament name"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1 font-medium">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description">
                      Tournament Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your tournament"
                      rows={4}
                      {...form.register("description")}
                    />
                    {form.formState.errors.description && (
                      <p className="text-sm text-red-500 mt-1 font-medium">
                        {form.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="creatorName">
                      Tournament Organizer
                    </Label>
                    <Input
                      id="creatorName"
                      placeholder="Your name or organization"
                      {...form.register("creatorName")}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be displayed as the tournament organizer
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Tournament Images</h3>
                      <p className="text-sm text-muted-foreground">
                        Add custom images to make your tournament stand out
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label>Thumbnail Image</Label>
                        <ImageUpload
                          value={thumbnailImage}
                          onChange={setThumbnailImage}
                          onRemove={() => setThumbnailImage(null)}
                          aspectRatio="video"
                          maxSize={5 * 1024 * 1024} // 5MB
                          maxWidth={800}
                          maxHeight={600}
                          label="Upload Thumbnail"
                          description="Used in tournament listings and cards"
                          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: 800×600px or 16:9 aspect ratio
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Banner Image</Label>
                        <ImageUpload
                          value={bannerImage}
                          onChange={setBannerImage}
                          onRemove={() => setBannerImage(null)}
                          aspectRatio="banner"
                          maxSize={10 * 1024 * 1024} // 10MB
                          maxWidth={1920}
                          maxHeight={1080}
                          label="Upload Banner"
                          description="Used as header on tournament page"
                          acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommended: 1920×1080px or 2:1 aspect ratio
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Pro tip:</strong> Images help attract more participants! If you don't upload custom images,
                        we'll use default images based on your selected game.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="mb-6">
                  <CardTitle className="text-xl font-semibold mb-2">Game & Format</CardTitle>
                  <CardDescription>
                    Select the game and tournament format
                  </CardDescription>
                </div>

                <div className="grid gap-8">
                  <div>
                    <Label>Game *</Label>
                    <div className="relative">
                      <Select
                        onValueChange={(value) => {
                          const gameProfile = gameProfiles.find(
                            (p) => p.game_key === value
                          );
                          form.setValue("game", value);
                          form.setValue("gameProfileId", gameProfile?.id || "");
                          setSelectedGameProfile(gameProfile);

                          // Set defaults based on game profile
                          if (gameProfile) {
                            form.setValue(
                              "teamSize",
                              gameProfile.default_team_size
                            );
                            if (gameProfile.game_key === "league_of_legends") {
                              form.setValue(
                                "leagueSettings.map",
                                "summoners_rift"
                              );
                              form.setValue(
                                "leagueSettings.draftType",
                                "tournament_draft"
                              );
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a game" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingGameProfiles ? (
                            <SelectItem disabled value="loading">Loading games...</SelectItem>
                          ) : gameProfiles.length === 0 ? (
                            <SelectItem disabled value="no-games">No games available</SelectItem>
                          ) : (
                            gameProfiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.game_key}>
                                {profile.game}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.formState.errors.game && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.game.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Tournament Type *</Label>
                    <div className="relative">
                      <Select
                        value={watchedValues.tournamentType}
                        onValueChange={(value) => {
                          form.setValue("tournamentType", value);
                          if (
                            value === TOURNAMENT_TYPE.TEAM &&
                            selectedGameProfile
                          ) {
                            form.setValue(
                              "teamSize",
                              selectedGameProfile.default_team_size
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tournament type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TOURNAMENT_TYPE.INDIVIDUAL}>
                            Individual Tournament
                          </SelectItem>
                          <SelectItem value={TOURNAMENT_TYPE.TEAM}>
                            Team Tournament
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                    <div>
                      <Label>Team Size *</Label>
                      <Select
                        value={String(watchedValues.teamSize)}
                        onValueChange={(value) =>
                          form.setValue("teamSize", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 players per team</SelectItem>
                          <SelectItem value="3">3 players per team</SelectItem>
                          <SelectItem value="4">4 players per team</SelectItem>
                          <SelectItem value="5">5 players per team</SelectItem>
                          <SelectItem value="6">6 players per team</SelectItem>
                          <SelectItem value="8">8 players per team</SelectItem>
                          <SelectItem value="10">
                            10 players per team
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedGameProfile && (
                    <Card className="p-4 bg-muted">
                      <h4 className="font-semibold mb-2">
                        {selectedGameProfile.game} Settings
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Recommended Team Size:{" "}
                          {selectedGameProfile.default_team_size === 1
                            ? "Individual"
                            : `${selectedGameProfile.default_team_size} players`}
                        </p>
                        <p>
                          Supports:{" "}
                          {[
                            selectedGameProfile.supports_individual &&
                              "Individual",
                            selectedGameProfile.supports_team && "Team",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {watchedValues.tournamentType ===
                          TOURNAMENT_TYPE.TEAM &&
                          watchedValues.teamSize !==
                            selectedGameProfile.default_team_size && (
                            <p className="text-yellow-600">
                              ⚠️ Your team size differs from the game's
                              recommended size
                            </p>
                          )}
                      </div>
                    </Card>
                  )}

                  {/* League of Legends Specific Settings */}
                  {selectedGameProfile?.game_key === "league_of_legends" && (
                    <Card className="p-6">
                      <CardHeader className="pb-4">
                        <h4 className="text-lg font-semibold">League of Legends Settings</h4>
                        <p className="text-sm text-muted-foreground">Configure game-specific options</p>
                      </CardHeader>
                      <CardContent className="pt-0">

                        <div className="grid gap-4">
                          {/* Map Selection */}
                          <div>
                            <Label>Map *</Label>
                            <Select
                              value={watchedValues.leagueSettings?.map}
                              onValueChange={(value) =>
                                form.setValue("leagueSettings.map", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="summoners_rift">
                                  Summoner's Rift
                                </SelectItem>
                                <SelectItem value="aram">
                                  ARAM (Howling Abyss)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Draft Type */}
                          <div>
                            <Label>Draft Type *</Label>
                            <Select
                              value={watchedValues.leagueSettings?.draftType}
                              onValueChange={(value) =>
                                form.setValue("leagueSettings.draftType", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tournament_draft">
                                  Tournament Draft
                                </SelectItem>
                                <SelectItem value="fearless_draft">
                                  Fearless Draft
                                </SelectItem>
                                <SelectItem value="blind_pick">
                                  Blind Pick
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Draft Details */}
                          {watchedValues.leagueSettings?.draftType ===
                            "tournament_draft" && (
                            <div className="bg-white p-4 rounded border">
                              <h5 className="font-medium mb-2 text-blue-800">
                                Tournament Draft Phases
                              </h5>
                              <div className="text-sm text-blue-700 space-y-1">
                                <p>
                                  • Phase 1: Each team bans 3 champions
                                  (alternating)
                                </p>
                                <p>
                                  • Phase 2: Each team picks 1 champion
                                  (alternating)
                                </p>
                                <p>
                                  • Phase 3: Each team picks 2 champions
                                  (alternating)
                                </p>
                                <p>
                                  • Phase 4: Each team bans 2 champions
                                  (alternating)
                                </p>
                                <p>
                                  • Phase 5: Each team picks 2 champions
                                  (alternating)
                                </p>
                              </div>
                            </div>
                          )}

                          {watchedValues.leagueSettings?.draftType ===
                            "fearless_draft" && (
                            <div className="bg-orange-50 p-4 rounded border border-orange-200">
                              <h5 className="font-medium mb-2 text-orange-800">
                                Fearless Draft Rules
                              </h5>
                              <div className="text-sm text-orange-700 space-y-1">
                                <p>
                                  • Champions picked in one game cannot be
                                  picked again in the series
                                </p>
                                <p>
                                  • Each team bans 5 champions simultaneously
                                </p>
                                <p>
                                  • Each team picks 5 champions simultaneously
                                </p>
                                <p>• Best suited for Best of 3/5 series</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div>
                    <Label>Tournament Format *</Label>
                    <div className="relative">
                      <Select
                        value={watchedValues.format}
                        onValueChange={(value) =>
                          form.setValue("format", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tournament format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TOURNAMENT_FORMAT.SINGLE_ELIMINATION}>
                            Single Elimination
                          </SelectItem>
                          <SelectItem value={TOURNAMENT_FORMAT.DOUBLE_ELIMINATION}>
                            Double Elimination
                          </SelectItem>
                          <SelectItem value={TOURNAMENT_FORMAT.ROUND_ROBIN}>
                            Round Robin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Match Format</Label>
                    <div className="relative">
                      <Select
                        value={watchedValues.settings?.matchFormat}
                        onValueChange={(value) =>
                          form.setValue("settings.matchFormat", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select match format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MATCH_FORMAT.BO1}>
                            Best of 1
                          </SelectItem>
                          <SelectItem value={MATCH_FORMAT.BO3}>
                            Best of 3
                          </SelectItem>
                          <SelectItem value={MATCH_FORMAT.BO5}>
                            Best of 5
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Round Robin Specific Options */}
                  {watchedValues.format === TOURNAMENT_FORMAT.ROUND_ROBIN && (
                    <Card>
                      <CardHeader className="pb-3">
                        <h4 className="font-semibold flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Round Robin Configuration
                        </h4>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Round Robin Type</Label>
                          <Select
                            value={watchedValues.roundRobinType}
                            onValueChange={(value) =>
                              form.setValue("roundRobinType", value)
                            }
                          >
                            <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ROUND_ROBIN_TYPE.SINGLE}>
                                Single Round Robin
                              </SelectItem>
                              <SelectItem value={ROUND_ROBIN_TYPE.DOUBLE}>
                                Double Round Robin
                              </SelectItem>
                              <SelectItem value={ROUND_ROBIN_TYPE.GROUPS}>
                                Group Round Robin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Group-specific options */}
                        {watchedValues.roundRobinType ===
                          ROUND_ROBIN_TYPE.GROUPS && (
                          <>
                            <div>
                              <Label>Number of Groups</Label>
                              <Select
                                value={watchedValues.groupCount?.toString()}
                                onValueChange={(value) =>
                                  form.setValue("groupCount", parseInt(value))
                                }
                              >
                                <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                                <SelectContent>
                                  {[2, 3, 4, 6, 8].map((count) => (
                                    <SelectItem
                                      key={count}
                                      value={count.toString()}
                                    >
                                      {count} groups
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Group Creation Method</Label>
                              <Select
                                value={watchedValues.groupCreationMethod}
                                onValueChange={(value) =>
                                  form.setValue("groupCreationMethod", value)
                                }
                              >
                                <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={GROUP_CREATION_METHOD.SKILL_BALANCED}>
                                    Skill Balanced
                                  </SelectItem>
                                  <SelectItem value={GROUP_CREATION_METHOD.SEEDED}>
                                    Seeded Distribution
                                  </SelectItem>
                                  <SelectItem value={GROUP_CREATION_METHOD.RANDOM}>
                                    Random Groups
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        <div className="bg-muted p-3 rounded-lg">
                          <h5 className="font-medium mb-2">
                            How Round Robin Works
                          </h5>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {watchedValues.roundRobinType === ROUND_ROBIN_TYPE.SINGLE && (
                              <p>Each participant plays every other participant exactly once.</p>
                            )}
                            {watchedValues.roundRobinType === ROUND_ROBIN_TYPE.DOUBLE && (
                              <p>Each participant plays every other participant twice.</p>
                            )}
                            {watchedValues.roundRobinType === ROUND_ROBIN_TYPE.GROUPS && (
                              <p>Participants are split into balanced groups for round robin play.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Participants</CardTitle>
                  <CardDescription>
                    Configure how many{" "}
                    {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                      ? "teams"
                      : "participants"}{" "}
                    can join and who can participate.
                  </CardDescription>
                </div>

                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="maxParticipants">
                      Maximum{" "}
                      {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                        ? "Teams"
                        : "Participants"}{" "}
                      *
                    </Label>
                    <Select
                      value={watchedValues.maxParticipants?.toString()}
                      onValueChange={(value) =>
                        form.setValue("maxParticipants", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 8, 16, 32, 64, 128].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} participants
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {duration && (
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>
                            Estimated duration: {duration.estimatedHours} hours
                            ({duration.estimatedMatches} matches)
                          </span>
                        </div>
                      </div>
                    )}
                    {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <strong>Team Tournament:</strong> Teams will need to
                          register with {watchedValues.teamSize} players each.
                          Team captains will select their roster and manage
                          match participation.
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Who can participate?</Label>
                    <Select
                      value={watchedValues.participationType}
                      onValueChange={(value) =>
                        form.setValue("participationType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PARTICIPATION_TYPE.ANYONE}>
                          Anyone
                        </SelectItem>
                        <SelectItem value={PARTICIPATION_TYPE.REGISTERED_ONLY}>
                          Registered Users Only
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Explanatory note for team tournaments */}
                    {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM && (
                      <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-blue-800">
                          <strong>Team Tournament Rules:</strong>
                          <ul className="mt-1 ml-4 list-disc space-y-1">
                            <li>
                              Team captains are always required to be registered
                              users
                            </li>
                            <li>
                              {watchedValues.participationType ===
                              PARTICIPATION_TYPE.ANYONE
                                ? "Team members can be invited by username or email (unregistered users can join via invite links)"
                                : "All team members must have registered accounts to participate"}
                            </li>
                            <li>
                              Captains manage their team roster and make
                              match-related decisions
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Seeding Method</Label>
                    <Select
                      value={watchedValues.seedingType}
                      onValueChange={(value) =>
                        form.setValue("seedingType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEEDING_TYPE.RANDOM}>
                          Random Seeding
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.RANKED}>
                          Ranked Seeding
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.RECENT_PERFORMANCE}>
                          Recent Performance
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.SKILL_BALANCED}>
                          Skill Balanced
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.AI_OPTIMIZED}>
                          AI Optimized
                        </SelectItem>
                        <SelectItem value={SEEDING_TYPE.MANUAL}>
                          Manual Seeding
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="password">
                      Tournament Password (Optional)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Leave empty for public tournament"
                      {...form.register("password")}
                    />
                    <div className="flex items-center space-x-2 mt-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Add a password to make your tournament private
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Tournament Settings</CardTitle>
                  <CardDescription>
                    Configure additional settings and rules for your tournament.
                  </CardDescription>
                </div>

                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="rules">Tournament Rules</Label>
                    <Textarea
                      id="rules"
                      placeholder="Describe specific rules, restrictions, or guidelines..."
                      rows={4}
                      {...form.register("settings.rules")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="prizeInfo">Prize Information</Label>
                    <Textarea
                      id="prizeInfo"
                      placeholder="Describe prizes, rewards, or recognition for winners..."
                      rows={3}
                      {...form.register("settings.prizeInfo")}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Match Settings</h4>
                    <div className="grid gap-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register("settings.allowForfeits")}
                          className="rounded"
                        />
                        <span className="text-sm">Allow forfeits</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register(
                            "settings.scoreConfirmationRequired"
                          )}
                          className="rounded"
                        />
                        <span className="text-sm">
                          Require score confirmation from both players
                        </span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...form.register("settings.checkInRequired")}
                          className="rounded"
                        />
                        <span className="text-sm">
                          Require participant check-in before tournament starts
                        </span>
                      </label>
                    </div>
                  </div>

                  <Separator />

                  <Card className="p-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Trophy className="h-6 w-6" />
                        <h4 className="text-lg font-semibold">
                          Tournament Preview
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Review your tournament settings
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <h5 className="font-medium mb-3">
                              Tournament Info
                            </h5>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Name:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.name || "Untitled Tournament"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Game:
                                </span>{" "}
                                <span className="font-medium">
                                  {selectedGameProfile?.game || "Not selected"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Type:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                                    ? "Team Tournament"
                                    : "Individual Tournament"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Format:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.format?.replace("_", " ") || "Single Elimination"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-muted rounded-lg">
                            <h5 className="font-medium mb-3">
                              Battle Rules
                            </h5>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Participants:
                                </span>{" "}
                                <span className="font-medium">
                                  Up to {watchedValues.maxParticipants}{" "}
                                  {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                                    ? "teams"
                                    : "players"}
                                </span>
                              </p>
                              {watchedValues.tournamentType ===
                                TOURNAMENT_TYPE.TEAM && (
                                <p>
                                  <span className="font-medium text-muted-foreground">
                                    Team Size:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {watchedValues.teamSize} players per team
                                  </span>
                                </p>
                              )}
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Match Format:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.settings?.matchFormat?.toUpperCase() || "BO1"}
                                </span>
                              </p>
                              {duration && (
                                <p>
                                  <span className="font-medium text-muted-foreground">
                                    Duration:
                                  </span>{" "}
                                  <span className="font-medium">
                                    {duration.estimatedHours} hours
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <h5 className="font-medium mb-3">
                              Access Control
                            </h5>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Who can join:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.tournamentType === TOURNAMENT_TYPE.TEAM
                                    ? watchedValues.participationType === PARTICIPATION_TYPE.ANYONE
                                      ? "Open teams (captains registered)"
                                      : "Registered teams only"
                                    : watchedValues.participationType === PARTICIPATION_TYPE.ANYONE
                                    ? "Open to everyone"
                                    : "Registered users only"}
                                </span>
                              </p>
                              <p>
                                <span className="font-medium text-muted-foreground">
                                  Privacy:
                                </span>{" "}
                                <span className="font-medium">
                                  {watchedValues.password
                                    ? "Password Protected"
                                    : "Public Tournament"}
                                </span>
                              </p>
                            </div>
                          </div>

                          {selectedGameProfile && (
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Gamepad2 className="h-5 w-5" />
                                <h5 className="font-medium">
                                  Game Settings
                                </h5>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Game-specific rules configured</p>
                                <p>Tournament format optimized</p>
                                <p>Ready for competitive play</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {form.formState.errors.root && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {form.formState.errors.root.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-4 bg-muted rounded-lg">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-4 w-full sm:w-auto order-1 sm:order-2">
            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="w-full sm:w-auto"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                onClick={() => {
                  console.log("Submit button clicked!");
                  console.log("Form valid:", form.formState.isValid);
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form values:", form.getValues());
                  console.log("Selected game profile:", selectedGameProfile);
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span className="hidden sm:inline">Creating Tournament...</span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Create Tournament</span>
                    <span className="sm:hidden">Create</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
