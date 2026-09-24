# ToDo App: Complete Requirements (SwEnt Bootcamp 2026)

Source: every page under https://github.com/swent-epfl/public/tree/main/bootcamp
(README, deliverables/B1, B2, B3, and docs/). Section numbers match the handout steps.

---

## 0. General / cross-cutting requirements

### 0.1 Architecture
- The app is a Kotlin / Jetpack Compose Android app, package `com.github.se.bootcamp`.
- **MVVM** everywhere:
  - `model/`: data classes and repositories (Firestore, Location, Auth, ...).
  - `ui/`: Composable screens and their ViewModels.
  - ViewModels expose UI state through `StateFlow`, so state survives recomposition and rotation.
  - ViewModels depend on repository **interfaces**, not on Firebase or concrete implementations (repository injected through the constructor, with a default value).
  - Views observe ViewModel state and delegate user actions back to the ViewModel.
- Repositories use `suspend` functions. Coroutines run from `viewModelScope` inside ViewModels, never on the UI thread.
- Never block the main thread with I/O.

### 0.2 Template and signature constraints
- Do not change signatures of provided classes, functions or parameters. You can only **add** parameters that have default values.
- Never edit anything under `sigchecks/` (`SignatureChecks.kt`, `GreetingSigchecks.kt`, ...). The app must compile with them.
- Do not modify the provided test files. Add your own tests in new files.
- Do not change the Gradle wrapper, AGP, Kotlin, Compose BOM, Firebase BOM or other version-catalog pins.
  Toolchain: AGP 9.3.0, Gradle 9.5.0, Kotlin 2.3.0, Compose BOM 2026.08.00, Firebase BOM 34.18.0, JDK 17.
- `compileSdk = 37`, `minSdk = 29`, `sourceCompatibility`/`targetCompatibility = JavaVersion.VERSION_17`.
- If you use kotlinx-serialization, add the serialization plugin through the version catalog, not as a hard-coded `id(...) version "..."` line.
- Every UI element the tests use must have the right `Modifier.testTag(...)`, using the tags defined in
  `GreetingScreenTestB1Tags`, `OverviewScreenTestTags`, `NavigationTestTags`, `MapScreenTestTags`,
  `AddToDoScreenTestTags`, `EditToDoScreenTestTags` and `SignInScreenTestTags`
  (placement shown in the Figma "Testing" page).
- Tests check behaviour, not looks. Colors and styling are free as long as the required elements are present and usable.
- The AddToDo and EditToDo screens must show **all** their UI elements on a **1080x2424** screen (Pixel 10a).

### 0.3 Repo, CI and process
- Work on `main`, or PR into `main`. Set `BOOTCAMP_PART` (`B1`, `B2` or `B3`) in `.github/workflows/CI.yml`.
- CI jobs: `{part}-public` must be green (staff tests are soft-fail), formatting, assemble and lint,
  a `userStories.txt` format check, and `actualTimeB*.csv` time-tracking checks.
  In B3 CI also runs the Maps `LOCAL_PROPERTIES` setup, the Firestore rules tests and the `prReviewMCQ.md` check.
- Fill in `actualTimeB1.csv`, `actualTimeB2.csv` and `actualTimeB3.csv` without changing their structure.
- The code must be formatted with ktfmt (`./gradlew ktfmtFormat`, `./gradlew ktfmtCheck`). An optional pre-commit hook runs `ktfmtCheck`.
- Never commit `google-services.json` or `local.properties`. They go into the GitHub secrets
  `GOOGLE_SERVICES` and `LOCAL_PROPERTIES`, base64-encoded.
- **Commit messages**: imperative mood, capitalized subject of at most 50 characters, descriptive
  (no bare "fix" or "update"). Leave a blank line, then an optional body wrapped at 72 characters explaining what and why.
  Issue references are optional. With Conventional Commits (`feat(scope): ...`) the description is **not** capitalized.
- Agent rules (`AGENTS.md`): one bounded, reviewable change per PR; stage only the files you changed
  (never `git add .` or `-A`); credit the AI contributor (`Co-authored-by`); every new code comes with unit tests;
  `./gradlew check` and `ktfmtCheck` pass; instrumented features pass `connectedDebugAndroidTest`
  with the Android emulator and the Firebase emulator running.

---

## 1. B1: Greeting App (`GreetingScreen.kt`)
- `GreetingScreen()` shows:
  - a text field to enter a name,
  - a button to validate the name,
  - a greeting message.
- The initial message is exactly `What's your name ?`.
- After typing a name and clicking the button, the message becomes `Hi <name>`.
- Use the test tags from `GreetingScreenTestB1Tags`.
- (B1 only) `BootcampApp()` in `MainActivity.kt` calls `GreetingScreen`. Later it is replaced by the ToDo app.
- Test suite: `GreetingScreenTestB1`.

---

## 2. B1: Local repository (`ToDosRepositoryLocal`)
- Keeps an in-memory list of `ToDo` objects. Data is lost when the app is closed (no persistence).
- Implements the suspending functions of the `ToDosRepository` interface.
- Test data can be set only through the `repository` property in `ToDosRepositoryProvider.kt` (tests override it).
- Test suite: `ToDosRepositoryLocalTestB1` (unit tests).

---

## 3. B1: Overview screen (list of ToDos)

User story: *As a user, I want to view a list of my Todos, so that I can easily see all my pending tasks at once.*

- The list is **scrollable** so it handles many items (`LazyColumn`).
- If the list is **empty**, a text message says the ToDo list is empty.
- Each item (a `Card`) shows **title, status, assignee name and due date**.
- The due date uses the format **`dd/MM/yyyy`**.
- Each of these values is its **own `Text`**, with **no label**. The tests match exact values:
  `Created` passes and `Status: Created` fails; `25/12/2023` passes and `Due: 25/12/2023` fails.
- Status text comes from `ToDoStatus.displayString()`: **`Created`, `Started`, `Ended`, `Archived`**
  (not "To Do / In Progress / Done" as in the mockup).
- The list is sorted by **insertion order, oldest first**.
- State lives in `OverviewViewModel` as `StateFlow`, loaded through `viewModelScope`.
- Test suite: `OverviewScreenB1Test` (tags in `OverviewScreenTestTags`).

---

## 4. B1: Navigation

Screens: **Overview**, **AddTodo** (placeholder in B1), **Map** (placeholder in B1).

### Top bar
- It shows the name of the current screen:
  - Overview: **`Overview`**
  - AddTodo: **`Create a new task`**
  - Map: **`Map`**
  - (B2) EditTodo: **`Edit Todo`**
- AddTodo (and EditTodo) has a **back arrow** in the top bar that returns to Overview.

### Bottom bar
- It has **two tabs**: Overview and Map. Clicking a tab shows that screen.

### Overview
- It has a button to add a ToDo (FAB), which navigates to AddTodo.

### System Back button
- From AddTodo, go back to Overview.
- From Overview, close the app.
- From the Map tab, go back to Overview.

### State restoration (scroll position)
- **Back navigation restores state.** Example: scroll down the list, open AddTodo, press Back:
  the list is **still scrolled down**.
- **Forward navigation does not restore state.** Switching tabs counts as forward navigation. Example:
  scroll down on Overview, switch to Map, tap the Overview tab: the list is **back at the top**.
- **Tapping the tab you are already on does not reset the screen.** Example: on Overview, scroll down,
  tap Overview again: the list **stays scrolled down**.
- (Hint: the usual `popUpTo(startDestination) + launchSingleTop` keeps state even on tab switch,
  which is wrong. Use `saveState`/`restoreState` only when re-selecting the current tab.)
- **Redirections after Save or Delete (B2) are forward navigation**, so Overview is not restored
  (the list starts at the top).

- Tags: `OverviewScreenTestTags`, `MapScreenTestTags`, `NavigationTestTags`.
- Test suites: `NavigationB1Test`, and later `NavigationB2Test` (includes AddToDo and EditToDo navigation).

---

## 5. B1: CI, APK, user stories
- CI is configured through `.github/workflows/CI.yml`. `B1-public` must be green on `main`.
- Code coverage uses JaCoCo: `./gradlew check connectedCheck jacocoTestReport`.
- Build an APK with `./gradlew build`. The output is in `app/build/outputs/apk/debug`.
- **`userStories.txt`** at the repo root contains **2 new user stories**, different from the provided ones:
  - **one complete story per line**, with no line breaks inside a story and no blank lines,
  - format: `As a [user type], I want [action] so that [benefit].`
  - they should follow INVEST (Independent, Negotiable, Valuable, Estimable, Small, Testable).

---

## 6. B2: Firebase / Firestore setup
- Firebase project "bootcamp" (Analytics and AI assistance disabled), Android package `com.github.se.bootcamp`.
- Put `app/google-services.json` in place (not committed), then re-enable `alias(libs.plugins.gms)` in `app/build.gradle.kts`.
- Firestore database created in test mode (later locked down in B3).
- GitHub secret `GOOGLE_SERVICES` holds the base64 of `google-services.json`.
- Firebase Emulator Suite (Node 20+, JDK 21+, Firebase CLI). Run `firebase use --add` (not `firebase init`) to create `.firebaserc`.
- For manual debugging against the emulators, call `useEmulator("10.0.2.2", 8080/9099)` **only in debug builds**, before any other Firebase call.
- Instrumented Firebase tests extend `FirebaseEmulatedTest`.

---

## 7. B2: Firestore repository (`ToDosRepositoryFirestore`)
- Each ToDo is **one document in the `todos` collection**.
- ToDos are identified by `uid`. **Two ToDos can never share a `uid`** (you choose how: throw, overwrite, ...).
- The repository **does not generate uids**. The caller creates the uid before calling `addTodo`.
- Use `suspend` functions with `await()`.
- Convert to and from `Map<String, Any>` by hand (Firestore auto-mapping fails because `ToDo` has no no-arg constructor).
- Write and read the nested **`Location` in full (name, latitude, longitude)** so a saved ToDo round-trips exactly.
- Helper methods (such as `DocumentSnapshot -> ToDo`) catch their own errors and log them with `Log.e()`.
- **Database operation errors propagate** to the ViewModel so the user can be told. Do not swallow them.
- Test suite: `ToDosRepositoryFirestoreTestB2` (needs the Firebase emulator).

---

## 8. B2: Add ToDo screen (`AddTodoScreen`)

User story: *As a user, I want to create a new Todo with details like title, description, assignee,
location, and due date, so that I can organize and track my tasks efficiently.*

### Fields (`OutlinedTextField`), each showing the text the user typed
- Title
- Description (tall enough for **several lines**)
- Assignee
- Location (in B2: a placeholder text field with a hard-coded `Location`)
- Due date in `dd/mm/yyyy`
- **No** field for `ownerId` (hard-coded, for example `""`, in B2).

### Validation
- **Title, Description, Assignee and Date are mandatory**: not empty and not blank.
- **Location is optional** in B2 (can be empty or blank).
- The date format is **strict**: 2-digit day `/` 2-digit month `/` 4-digit year.
  - Invalid: `1/3/2025`, `12/03/25`, `12-03-2025`, `15/10/25`.
  - `SimpleDateFormat` is lenient, so enforce the format yourself (for example with a regex, or `isLenient = false` plus a length check).
  - Calendar-impossible dates such as `31/02/2023` are **not checked** and count as valid.
- The error message appears **immediately while typing**, with no button press or focus change.
  Example: typing `15/10/25` shows the error when the last character is typed.
- There is **one single error message node**, tagged `ERROR_MESSAGE`, for the current error.
  Do not add one tagged error node per field.
- Save only works with valid data.

### Save
- Pressing **Save** creates the ToDo (new uid), stores it in Firestore, and **redirects to Overview**.
- The new ToDo is **visible in the list right away**, with no extra user action (the list is refreshed).
- The redirection is **forward navigation** (Overview state is not restored).
- If the Firestore operation fails, the user is notified (no silent success).
- All B1 requirements still hold.
- Test suites: `AddToDoScreenB2Test`, `AddToDoFirestoreEmulatedTestB2`, `NavigationB2Test`.
- "Some requirements are not covered by the provided tests": write your own tests.

---

## 9. B2: Overview backed by Firestore
- `ToDosRepositoryProvider.repository` points to `ToDosRepositoryFirestore`.
- Overview shows the real ToDos from Firestore, or the empty-list message when there are none.
- No public tests: check by hand (add in AddTodo, see it in Overview).

---

## 10. B2: Edit ToDo screen (`EditToDoScreen`)

User story: *As a user, I want to view, modify, and delete an existing Todo, so that I can keep my
task list accurate and up to date.*

- Clicking a ToDo in Overview opens EditToDo **for that ToDo**.
- All fields are **pre-filled** with the ToDo's current values.
- The top bar title is exactly **`Edit Todo`**, with a back arrow.
- Editable: Title, Description, Assignee, Location, Due date, **Status**.
- **Same validation rules** as AddToDo (mandatory fields, strict date, single `ERROR_MESSAGE`, live errors).
- A **Status button** cycles `CREATED -> STARTED -> ENDED -> ARCHIVED -> CREATED -> ...`.
  Its label is **only** the enum name (for example `CREATED`), nothing else.
- A **Delete button** deletes the ToDo.
- **Save** works only if all inputs are valid.
- After a valid save or a delete, **redirect to Overview**. The list shows the change.
  This is forward navigation (state not restored).
- **Back** (system back or top-bar arrow) **discards unsaved changes**. Overview shows the list as it was
  before opening Edit (back navigation, so scroll state is restored).
- All elements are visible on 1080x2424.
- In B2: hard-coded `Location`, hard-coded `ownerId`, no ownerId field.
- Test suites: `EditToDoScreenB2Test`, `EditToDoFirestoreEmulatedTestB2`, `NavigationB2Test`, plus the staff End-to-End test (Black belt).

---

## 11. B3: Authentication (Google Sign-In)

User stories:
- *As a user, I want to sign up and log into the app, so that my ToDos are kept across devices.*
- *As a user, I want to sign in with my Google account, so that I can securely access my personal ToDos.*

### Setup
- Add the SHA-1 fingerprint (`./gradlew signingReport`) in Firebase, enable the Google sign-in provider,
  download the new `google-services.json`, and update the `GOOGLE_SERVICES` secret.

### Behaviour
- The user can **sign in with Google**. On success, redirect to **Overview**.
- The user can sign in with **any** Google account, not only the one on the device (they can add a new one).
- The user can **log out** with a **logout button on Overview**. On success, redirect to **SignInScreen**.
- After logging out and back in with the same account, the user sees their earlier ToDos (only theirs, see access control).
- App start: **not signed in -> SignInScreen**; **signed in -> OverviewScreen**.
- After closing the app while signed in, resuming the session or asking to sign in again are both allowed.
- **Use the injected `credentialManager`** from `BootcampApp` (default `CredentialManager.create(context)`)
  for **both** sign-in and sign-out. Never create a second one inside the screen (tests inject a fake).

### Recommended structure (not sigchecked)
- `model/authentication/AuthRepository.kt`: `signInWithGoogle(credential: Credential): Result<FirebaseUser>`, `signOut(): Result<Unit>`.
- `model/authentication/AuthRepositoryFirebase.kt`: Credential -> Google ID token -> `FirebaseAuth.signInWithCredential`; `signOut()` calls `Firebase.auth.signOut()`.
- `model/authentication/GoogleSignInHelper.kt`: an interface plus a default implementation that extracts the ID token from the credential `Bundle` and builds the `AuthCredential` (keeps things unit-testable).
- `ui/authentication/SignInViewModel.kt`: `AuthUIState(isLoading, user, errorMsg, signedOut)`, takes an `AuthRepository` (default `AuthRepositoryFirebase()`), and `signIn(context, credentialManager)` does:
  build `GetSignInWithGoogleOption` with `R.string.default_web_client_id` -> get the credential -> `repository.signInWithGoogle` -> update state.
- `SignInScreen(credentialManager, viewModel)` with the Google sign-in button.
- Tags: `SignInScreenTestTags`, `OverviewScreenTestTags`. Test suite: `AuthenticationB3Test` (write more of your own).

---

## 12. B3: Access control
- Every ToDo has **`ownerId` = the creator's Firebase UID** (`Firebase.auth.currentUser?.uid`),
  set when creating or editing (in the Add/Edit ViewModels).
- The Firestore repository **queries only the current user's ToDos** (`whereEqualTo("ownerId", uid)`).
  Rules are not filters: an unfiltered query fails.
- `firestore.rules` (kept correct **in the repo**, since CI tests it):
  - a user can only **read (get/list) and update** their own ToDos,
  - a user can only **create** a ToDo if `ownerId == request.auth.uid`,
  - (not stated in the handout, but logical: delete only their own.)
- Deploy the rules to the real Firestore (console or `firebase deploy`).
- Check with `firebase/firestore/test` (`npm run main` against a running emulator).
- A second account must not see the first account's ToDos.
- Some old B2 instrumented tests may fail under these rules. This is expected.

---

## 13. B3: Location-based ToDos (Nominatim forward geocoding)

### Model
- `model/map/Location.kt` (already provided, sigchecked): name, latitude, longitude.
- New `model/map/LocationRepository.kt`:
  ```kotlin
  interface LocationRepository { suspend fun search(query: String): List<Location> }
  ```
- New `model/map/NominatimLocationRepository.kt`:
  ```kotlin
  class NominatimLocationRepository(val client: OkHttpClient) : LocationRepository
  ```
- Use `HttpClientProvider.client` (from `MainActivity.kt`) and OkHttp. Call the Search API with **`format=json`**.
  Parse the JSON (for example with `org.json`) into `List<Location>`.
- **Nominatim usage policy**: send a **real `User-Agent`** that identifies the app, and make **at most 1 request per second**.
- **Tests never call the real Nominatim API**: mock `OkHttpClient` (mockk, mockito or MockWebServer), and assert the parsed fields.

### UI (AddToDo and EditToDo)
- The user types a location as text, which is geocoded through Nominatim.
- Suggestions appear in a **`DropdownMenu` of `DropdownMenuItem`s**. The user picks one.
- Show **at most 5 suggestions**.
- A reusable location-picker composable shared by Add and Edit is recommended (not tested).
- **On Edit, the location text field starts empty** (`locationQuery = ""`), while the ToDo keeps its selected
  `Location` in state. The placeholder is something like `Enter an Address or Location` (same on Add).
  Typing starts a fresh query. The other Edit fields stay pre-filled.
- **Each screen (Add and Edit) has its own top bar**, tagged `TOP_BAR_TITLE` and `GO_BACK_BUTTON`.
  In B3 the top bar moves out of `BootcampApp` into each screen.
- Tags: `AddToDoScreenTestTags`, `EditToDoScreenTestTags`. Test suite: `LocationBasedTodosB3Test`.

---

## 14. B3: Google Maps (`ui/map/Map.kt`)
- The Maps API key goes in `local.properties` as `MAPS_API_KEY=...` (no quotes, never committed).
  Secret `LOCAL_PROPERTIES` holds the base64 of a `local.properties` containing only the key.
- The Map screen shows a `GoogleMap` with:
  - the camera **centered on the first ToDo's location** if there is one, **otherwise a default location** (for example EPFL),
  - a **marker for every ToDo that has a location**.
- Tag the map with `MapScreenTestTags.GOOGLE_MAP_SCREEN`.
  `getTestTagForTodoMarker` does not work with `onNodeWithTag`. Test markers through the repository or UI state.
- Keep logic separate from map components so it can be unit tested (Maps SDK classes are final).
- Test suite: `GoogleMapsB3Test`.

---

## 15. B3: Code review, testing, coverage
- Review the staff `calendar` PR (`CalendarToDo` timeline feature) on GitHub. Leave comments and request changes.
  **Do not merge it.** Answer `prReviewMCQ.md`.
- Write your own tests for your code (unit and instrumented), including corner cases, in **new files**.
- Coverage goals (JaCoCo): **85% line coverage** (Blue), **65% branch coverage** (Black).
- Multi-agent flow (code agent, test agent, reviewer agent with a `review-checklist` skill in `.github/skills/`).
  You review and own every line.

---

## 16. Belt criteria summary

| Belt | B1 | B2 | B3 |
|---|---|---|---|
| Yellow | Greeting + TodoList public, good commits, 2 user stories | CreateAToDo public, good commits | Auth public + staff, PR review + MCQ, acceptable commits |
| Green | + Navigation public | + TodoList and EditToDo public | + AccessControl public, LocationBasedTodos public + staff, good commits |
| Blue | + TodoList staff | + all B2 staff (Create, List, Edit) | + GoogleMaps public + staff, 85% line coverage |
| Black | + Navigation staff | + staff End-to-End test | + 65% branch coverage, perfect commits |
