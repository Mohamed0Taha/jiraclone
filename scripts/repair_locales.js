/*
  Repair locale JSONs by applying curated overrides and fixing common corruption patterns.
  - Ensures en.json contains only proper English strings for targeted sections
  - Provides professional translations for DE, ES, FR, NL, SV, FI for the same sections
  - Fixes common missing-first-letter artifacts in targeted sections
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const locales = ['en', 'de', 'es', 'fr', 'nl', 'sv', 'fi', 'pt', 'it', 'hu', 'ro', 'pl', 'ru', 'da', 'no', 'et', 'lv'];

function loadLocale(locale) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveLocale(locale, obj) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  const str = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, str, 'utf8');
}

function set(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function get(obj, dottedKey) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (const k of parts) {
    if (!cur || typeof cur !== 'object' || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

// Targeted keys to normalize across locales. These are high-visibility/common UI strings.
const keys = {
  common: [
    'welcome','dashboard','projects','tasks','timeline','board','profile','settings','logout','login','register',
    'email','emailAddress','firstName','lastName','password','confirmPassword','submit','cancel','save','delete','edit','create','close','search','filter','sort','loading','error','success','warning','info','user','signedInAs','subscriptions','getCertified','upgradeNow','there','or','back','countMeter','finish','goToHomepage','next','notNow','previous','priority','project','saved','skip','title','unassigned','increase','decrease','text'
  ],
  navigation: ['home','about','contact','help','documentation','navigation','settings'],
  buttons: ['create','save','cancel','delete','edit','close','submit','reset','confirm','back','next','previous','finish','retry','refresh','upload','download','export','import','copy','paste','cut','undo','redo'],
  forms: ['name','title','description','email','password','confirmPassword','firstName','lastName','phoneNumber','address','city','country','zipCode','company','website','required','optional','placeholder','selectOption','chooseFile','dragDropFile'],
  validation: ['required','invalidEmail','passwordTooShort','passwordMinLength','passwordMismatch','nameMinLength','invalidFormat','tooLong','tooShort','invalidNumber','invalidDate','invalidUrl'],
  tooltips: ['help','info','warning','error','settings','profile','notifications','search','filter','sort','view','edit','delete','share','copy','move','archive','restore','download','upload','refresh','fullscreen','minimize','maximize','close'],
  auth: [
    'login','register','email','emailAddress','fullName','password','confirmPassword','rememberMe','forgotPassword','alreadyRegistered','confirmPasswordText','resetPassword','resetPasswordText','emailPasswordResetLink','name','passwordConfirmation','signInWithEmail','signingIn','dontHaveAccount','continueWithGoogle','or','createAccount','creatingAccount','processing','newPassword','confirmNewPassword','welcomeBack','signInToAccount','togglePasswordVisibility','noAccount','signUp','joinTaskPilot','createAccountToStart','createAccountWithEmail','alreadyHaveAccount','signIn','confirm','confirmPasswordDesc','confirmPasswordTitle','confirming','emailPasswordReset','logIn','logout','resetPasswordDesc','resetPasswordTitle','resettingPassword','sending','signUpNow'
  ],
  chat: [
    'projectAssistant','assistantDescription','chattingAbout','subscribeTitle','subscribeMessage','subscribeToSeeAnswer','upgradeNow','askAboutProject','typeMessage','networkError','failedResponse','typing','welcomeMessage','suggestionsTitle','errorOccurred'
  ],
  landing: [
    'heroTitle','heroSubtitle','heroDescription','loginButton','signUpFree','getStarted','learnMore','productivityJourney','methodologiesSupport','continueWithGoogle','signInDescription'
  ],
  board: [
    'taskBoard','methodology','methodologyName.kanban','methodologyName.scrum','methodologyName.agile','methodologyName.waterfall','methodologyName.lean',
    'status.todo','status.inprogress','status.review','status.done','status.backlog','status.testing',
    'columns.ideas','columns.build','columns.measure','columns.learn','columns.validated',
    'priority.low','priority.medium','priority.high','priority.urgent',
    'addTask','editTask','deleteTask','duplicateTask','moveTask','taskDetails','assignTask','unassignTask','setDueDate','removeDueDate','createSubtask','convertToSubtask','attachFile','addComment','addCommentPlaceholder','addMoreContext','addOptionalContext','allMembers','allPriorities','clearFilters','conciseTaskName','confirmDeleteTask','createSubTask','createTask','creating','details','dueDate','duplicateOf','markAsMilestone','milestone','optional','priorityFilter','priorityLabel','regularTask','searchTasks','selectDuplicate','selectAssignee','selectParent','startDate','taskDescription','taskPriorityLevel','taskTitle','teamMember','timeline','unassigned','updateTask','updating','viewDetails','writeReplyPlaceholder','actionCannotBeUndone','taskCount','taskCount_plural','percentComplete','mode','filterTasks','sortTasks','noTasksFound','noTasks','createFirstTask','executionDate','parentTask','subtask','creatingSubtask','team','members'
  ],
  project: [
    'title','description','status','priority','assignee','dueDate','created','updated','completed','inProgress','pending','archived','projectDetails','projectName','projectKey','timeline','startDate','endDate','close','editProject','notSet','untitledProject','additionalInformation','membersCount','membersCount_plural','noKey'
  ],
  tasks: [
    'status.todo','status.inprogress','status.review','status.done','status.backlog','status.testing',
    'priority.low','priority.medium','priority.high','priority.urgent',
    'noTasksYet','untitled','tooltips.taskId','tooltips.viewDetails','imageAlt','imageTitle','overdue','schedule.completed','schedule.elapsedPercent','schedule.fullyConsumed','schedule.noData','schedule.overdueSuffix','assignedTo','createdBy','comments','comment','commentsCount','aria.addImage','addCommentsHint'
  ],
  dashboard: [
    'welcomeBack','yourWorkspace','searchProjects','sortBy','sortRecent','sortNameAsc','sortNameDesc','allProjects','myProjects','totalTasks','completion','projectsCount','tasksCount','completionPercentage','noProjectsFound','createFirstProject','appsumoWelcome','leaveReview','getCertified','owner','collaborator','untitled','editProject','deleteProject','leaveProject','completionProgress'
  ],
  contactUs: [
    'title','detailsPlaceholder','characters','description','email','error.title','error.message','message','messagePlaceholder','minimumCharacters','moreCharactersNeeded','name','responseTime','sendAnother','sendMessage','sending','success.title','success.message','topic','topics.account','topics.billing','topics.bug','topics.feature','topics.feedback','topics.general','topics.other','topics.technical','tryAgain','yourDetails'
  ],
  assistantChat: ['close','copyMessage','sendMessage','confirmExecute','cancelCommand','thinkingAlt']
};

// Curated overrides per locale
const overrides = {
  en: {
    // common
    'common.back': 'Back',
    'common.countMeter': 'Counter',
    'common.decrease': 'Decrease',
    'common.finish': 'Finish',
    'common.goToHomepage': 'Go to homepage',
    'common.increase': 'Increase',
    'common.next': 'Next',
    'common.notNow': 'Not now',
    'common.previous': 'Previous',
    'common.priority': 'Priority',
    'common.project': 'Project',
    'common.saved': 'Saved',
    'common.skip': 'Skip',
    'common.title': 'Title',
    'common.unassigned': 'Unassigned',
    'common.text': 'Text',

    // auth (ensure English only)
    'auth.confirm': 'Confirm',
    'auth.confirmPasswordDesc': 'This is a secure area of the application. Please confirm your password before continuing.',
    'auth.confirmPasswordTitle': 'Confirm Password',
    'auth.confirming': 'Confirming...',
    'auth.emailPasswordReset': 'Email Password Reset',
    'auth.logIn': 'Log in',
    'auth.logout': 'Logout',
    'auth.resetPasswordDesc': 'Forgot your password? No problem. Just let us know your email address and we will email you a password reset link.',
    'auth.resetPasswordTitle': 'Reset Password',
    'auth.resettingPassword': 'Resetting password...',
    'auth.sending': 'Sending...',
    'auth.signUpNow': 'Sign up now',

    // landing
    'landing.continueWithGoogle': 'Continue with Google',
    'landing.signInDescription': 'Sign in to your account to continue',

    // tasks
    'tasks.addCommentsHint': 'Click to add comments',
    'tasks.aria.addImage': 'Add image',
    'tasks.assignedTo': 'Assigned to {{name}}',
    'tasks.comment': 'Comment',
    'tasks.comments': 'Comments',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Created by {{name}}',
    'tasks.imageAlt': 'Task image',
    'tasks.imageTitle': 'Task #{{id}}: {{title}}',
    'tasks.overdue': 'Task is overdue',
    'tasks.schedule.completed': 'Task completed',
    'tasks.schedule.elapsedPercent': '{{percent}}% of scheduled time elapsed',
    'tasks.schedule.fullyConsumed': '(Time fully consumed)',
    'tasks.schedule.noData': 'No schedule data',
    'tasks.schedule.overdueSuffix': '(overdue)',
    'tasks.tooltips.taskId': 'Task ID: {{id}}',
    'tasks.tooltips.viewDetails': 'Click to view task details and comments',
    'tasks.untitled': '(Untitled)',
    'tasks.noTasksYet': 'No tasks yet',

    // board (ensure English, fixing corrupt)
    'board.details': 'Details',
    'board.dueDate': 'Due Date',
    'board.duplicateOf': 'Duplicate Of',
    'board.executionDate': 'Execution Date',
    'board.viewDetails': 'View details',
    'board.columns.build': 'Build',
    'board.columns.ideas': 'Ideas',
    'board.columns.learn': 'Learn',
    'board.columns.measure': 'Measure',
    'board.columns.validated': 'Validated',

    // navigation
    'navigation.navigation': 'Navigation',

    // contactUs (fix corrupt fields)
    'contactUs.description': 'Description',
    'contactUs.email': 'Email',
    'contactUs.error.message': 'Error Message',
    'contactUs.error.title': 'Error Title',
    'contactUs.yourDetails': 'Your Details',

    // certification (fix missing letters)
    'certification.downloadCertificate': 'Download Certificate',

    // simulator (fix missing letters)
    'simulator.addTask.description': 'Description',
    'simulator.addTask.estimatedHours': 'Estimated Hours',
    'simulator.addTask.title': 'Title',
    'simulator.conflict.description': 'Description',
    'simulator.conflict.differentMembers': 'Different Members',
    'simulator.conflict.title': 'Title',
    'simulator.events.teamEvent': 'Team Event',
    'simulator.events.techDebt': 'Technical Debt',
    'simulator.experience.criticalDecisions': 'Critical Decisions',
    'simulator.features.analytics.description': 'Analytics Description',
    'simulator.features.instantFeedback.description': 'Instant Feedback Description',
    'simulator.features.noRegistration.description': 'No Registration Description',
    'simulator.guide.events.description': 'Events Description',
    'simulator.guide.events.title': 'Events Title',
    'simulator.guide.navigateWeeks.description': 'Navigate Weeks Description',
    'simulator.guide.tasks.description': 'Tasks Description',
    'simulator.guide.tasks.title': 'Tasks Title',
    'simulator.guide.guideTasks.description': 'Add and prioritize tasks to ensure effective progress.',
    'simulator.guide.guideTasks.title': 'Tasks',
    'simulator.guide.team.description': 'Team Description',
    'simulator.title': 'Title',
    'simulator.whatYouExperience': 'What You Experience',

    // project (fix German leakage)
    'project.membersCount': '{{count}} member',
    'project.membersCount_plural': '{{count}} members',
    'project.noKey': 'No key',

    // projects validation (fix German leakage)
    'projects.validation.endDateAfterStart': 'End date must be after start date',
    'projects.validation.keyFormat': 'Invalid key format',
    'projects.validation.keyMaxLength': 'Maximum key length exceeded',
    'projects.validation.keyRequired': 'Key is required',
    'projects.validation.nameRequired': 'Name is required',

    // members (fix French leakage)
    'members.editTasks': 'Edit Tasks',
    'members.failedToCancelInvitation': 'Failed to cancel invitation: {{error}}',
    'members.failedToInviteMember': 'Failed to invite member: {{error}}',
    'members.failedToLoadMembers': 'Failed to load members: {{error}}',
    'members.failedToRemoveMember': 'Failed to remove member: {{error}}',
    'members.failedToResendInvitation': 'Failed to resend invitation: {{error}}',
    'members.fullAccessOwner': '(Full Access - Owner)',
    'members.invitationCancelledSuccess': 'Invitation cancelled successfully!',
    'members.invitationResentSuccess': 'Invitation resent successfully!',
    'members.limitReachedTooltip': 'Member limit reached – upgrade to add more',
    'members.manageMembers': 'Manage Members',
    'members.memberAccess': '(Member Access)',
    'members.memberInvitedSuccess': 'Member invited successfully!',
    'members.memberLimitError': 'You have reached your member limit ({{used}}/{{limit}}). Upgrade your plan to add more team members.',
    'members.memberRemovedSuccess': 'Member removed successfully!',
    'members.removeExistingOrUpgrade': 'Remove an existing member or upgrade to increase your limit.',
    'members.role': 'Role',
    'members.switchToEnhanced': 'Switch to enhanced design',
    'members.upgrade': 'Upgrade',
    'members.viewTasks': 'View Tasks',

    // billing (fix Finnish/German leakage)
    'billing.cancelConfirmation': 'Are you sure you want to cancel your {{planName}} subscription? You will lose premium features at the end of the current billing period.',
    'billing.cancellationReasons.missing_features': 'Missing features',
    'billing.cancellationReasons.not_using_enough': 'Not using it enough',
    'billing.cancellationReasons.other': 'Other',
    'billing.cancellationReasons.switching_service': 'Switching service',
    'billing.cancellationReasons.technical_issues': 'Technical issues',
    'billing.cancellationReasons.temporary_pause': 'Temporary pause',
    'billing.cancellationReasons.too_expensive': 'Too expensive',
    'billing.dayTrial': '{{days}}-day trial',
    'billing.helpImprove': 'Help us improve by telling us why you are cancelling:',
    'billing.startDayTrial': 'Start {{days}}-day trial',
    'billing.stripeNotice': 'Payments are securely processed by Stripe. Start your free trial with any valid credit card.',
    'billing.subtitle': 'Choose a plan and start a free trial. Get access to premium features like AI task generation, team collaboration, and advanced reports.',
    'billing.trialEndsOn': 'Trial ends on {{date}}',
    'billing.upgradeToPlan': 'Upgrade to {{plan}} plan',

    // other obvious corruptions in en
    'members.cancelInvitation': 'Cancel invitation',
    'members.currentMembers': 'Current Members',
    'members.joined': 'Joined {{date}}',
    'members.resendInvitation': 'Resend invitation',
    'members.viewProject': 'View Project',
    'billing.invitationExpired': 'Invitation Expired',
    'errors.emailMismatch': 'Email Mismatch',
    'errors.fileProcessing': 'File Processing',
    'errors.invitationExpired': 'Invitation Expired',
    'errors.invitationExpiredMessage': 'The invitation has expired.',
    'errors.speechRecognitionError': 'Speech Recognition Error',
    'errors.speechRecognitionFailed': 'Speech Recognition Failed',

    // landing.features titles already correct in en
  },
  de: {
    // common
    'common.back': 'Zurück',
    'common.countMeter': 'Zähler',
    'common.decrease': 'Verringern',
    'common.finish': 'Fertig',
    'common.goToHomepage': 'Zur Startseite',
    'common.increase': 'Erhöhen',
    'common.next': 'Weiter',
    'common.notNow': 'Nicht jetzt',
    'common.previous': 'Zurück',
    'common.priority': 'Priorität',
    'common.project': 'Projekt',
    'common.saved': 'Gespeichert',
    'common.skip': 'Überspringen',
    'common.title': 'Titel',
    'common.unassigned': 'Nicht zugewiesen',
    'common.text': 'Text',

    // auth
    'auth.confirm': 'Bestätigen',
    'auth.confirmPasswordDesc': 'Dies ist ein sicherer Bereich der Anwendung. Bitte bestätigen Sie Ihr Passwort, bevor Sie fortfahren.',
    'auth.confirmPasswordTitle': 'Passwort bestätigen',
    'auth.confirming': 'Bestätigung...',
    'auth.emailPasswordReset': 'E‑Mail‑Passwort zurücksetzen',
    'auth.logIn': 'Anmelden',
    'auth.logout': 'Abmelden',
    'auth.resetPasswordDesc': 'Passwort vergessen? Kein Problem. Teilen Sie uns einfach Ihre E‑Mail‑Adresse mit und wir senden Ihnen einen Link zum Zurücksetzen des Passworts.',
    'auth.resetPasswordTitle': 'Passwort zurücksetzen',
    'auth.resettingPassword': 'Passwort wird zurückgesetzt...',
    'auth.sending': 'Wird gesendet...',
    'auth.signUpNow': 'Jetzt registrieren',

    // landing
    'landing.heroTitle': 'Der moderne Projektarbeitsbereich,',
    'landing.heroSubtitle': 'wo Produktivität auf Einfachheit trifft',
    'landing.heroDescription': 'Ein einziger Ort für Projekte, Aufgaben, Chat, Dokumente und mehr. Optimieren Sie Ihren Workflow und fördern Sie die Teamzusammenarbeit.',
    'landing.loginButton': 'Anmelden',
    'landing.signUpFree': 'Kostenlos registrieren',
    'landing.getStarted': 'Loslegen',
    'landing.learnMore': 'Mehr erfahren',
    'landing.productivityJourney': 'Starten Sie heute Ihre Produktivitätsreise',
    'landing.methodologiesSupport': 'Unterstützt alle Projektmanagement-Methoden',
    'landing.continueWithGoogle': 'Mit Google fortfahren',
    'landing.signInDescription': 'Melden Sie sich bei Ihrem Konto an, um fortzufahren',

    // chat
    'chat.projectAssistant': 'Projektassistent',
    'chat.assistantDescription': 'Fragen Sie nach Zusammenfassungen oder Aktionen. Erste Antwort als Vorschau sichtbar.',
    'chat.chattingAbout': 'Chat über:',
    'chat.subscribeTitle': 'Abonnieren, um fortzufahren',
    'chat.subscribeMessage': 'Um fortzufahren und KI-Einblicke zu sehen, müssen Sie abonnieren.',
    'chat.subscribeToSeeAnswer': 'Um diese KI-Antwort zu sehen und weiter zu chatten, abonnieren Sie einen kostenpflichtigen Plan.',
    'chat.upgradeNow': 'Jetzt upgraden',
    'chat.askAboutProject': 'Fragen Sie zu diesem Projekt...',
    'chat.typeMessage': 'Geben Sie Ihre Nachricht ein...',
    'chat.networkError': 'Netzwerkfehler. Bitte Verbindung prüfen und erneut versuchen.',
    'chat.failedResponse': 'Antwort des Assistenten fehlgeschlagen',
    'chat.typing': 'Assistent verfasst eine Antwort',
    'chat.welcomeMessage': 'Hallo! Ich bin Ihr Projektassistent. Fragen Sie mich alles zu "{{projectName}}".',
    'chat.suggestionsTitle': 'Vorgeschlagene Fragen',
    'chat.errorOccurred': 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.',

    // navigation
    'navigation.home': 'Startseite',
    'navigation.about': 'Über',
    'navigation.contact': 'Kontakt',
    'navigation.help': 'Hilfe',
    'navigation.documentation': 'Dokumentation',
    'navigation.navigation': 'Navigation',
    'navigation.settings': 'Einstellungen',

    // board (translate key actions)
    'board.taskBoard': 'Aufgabenboard',
    'board.methodology': 'Methodik',
    'board.status.todo': 'Zu erledigen',
    'board.status.inprogress': 'In Bearbeitung',
    'board.status.review': 'Überprüfung',
    'board.status.done': 'Erledigt',
    'board.status.backlog': 'Backlog',
    'board.status.testing': 'Tests',
    'board.columns.ideas': 'Ideen',
    'board.columns.build': 'Bauen',
    'board.columns.measure': 'Messen',
    'board.columns.learn': 'Lernen',
    'board.columns.validated': 'Validiert',
    'board.priority.low': 'Niedrig',
    'board.priority.medium': 'Mittel',
    'board.priority.high': 'Hoch',
    'board.priority.urgent': 'Dringend',
    'board.addTask': 'Aufgabe hinzufügen',
    'board.editTask': 'Aufgabe bearbeiten',
    'board.deleteTask': 'Aufgabe löschen',
    'board.duplicateTask': 'Aufgabe duplizieren',
    'board.moveTask': 'Aufgabe verschieben',
    'board.taskDetails': 'Aufgabendetails',
    'board.assignTask': 'Aufgabe zuweisen',
    'board.unassignTask': 'Zuweisung entfernen',
    'board.setDueDate': 'Fälligkeitsdatum setzen',
    'board.removeDueDate': 'Fälligkeitsdatum entfernen',
    'board.createSubtask': 'Unteraufgabe erstellen',
    'board.convertToSubtask': 'In Unteraufgabe umwandeln',
    'board.attachFile': 'Datei anhängen',
    'board.addComment': 'Kommentar hinzufügen',
    'board.addCommentPlaceholder': 'Kommentar hinzufügen...',
    'board.addMoreContext': 'Mehr Kontext hinzufügen',
    'board.addOptionalContext': 'Optionalen Kontext, Akzeptanzkriterien etc. hinzufügen',
    'board.allMembers': 'Alle Mitglieder',
    'board.allPriorities': 'Alle Prioritäten',
    'board.clearFilters': 'Filter löschen',
    'board.conciseTaskName': 'Kurzer Aufgabenname',
    'board.confirmDeleteTask': 'Möchten Sie diese Aufgabe wirklich löschen?',
    'board.createSubTask': 'Unteraufgabe erstellen',
    'board.createTask': 'Aufgabe erstellen',
    'board.creating': 'Wird erstellt...',
    'board.details': 'Details',
    'board.dueDate': 'Fälligkeitsdatum',
    'board.duplicateOf': 'Duplikat von',
    'board.markAsMilestone': 'Als Projektmeilenstein markieren',
    'board.milestone': 'Meilenstein',
    'board.optional': 'Optional',
    'board.priorityFilter': 'Prioritätsfilter',
    'board.priorityLabel': 'Priorität',
    'board.regularTask': 'Normale Aufgabe',
    'board.searchTasks': 'Aufgaben suchen...',
    'board.selectDuplicate': 'Ursprüngliche Aufgabe auswählen',
    'board.selectAssignee': 'Zuständigen auswählen',
    'board.selectParent': 'Übergeordnete Aufgabe auswählen',
    'board.startDate': 'Startdatum',
    'board.taskDescription': 'Aufgabenbeschreibung',
    'board.taskPriorityLevel': 'Aufgabenpriorität',
    'board.taskTitle': 'Aufgabentitel',
    'board.teamMember': 'Teammitglied',
    'board.timeline': 'Zeitachse',
    'board.unassigned': 'Nicht zugewiesen',
    'board.updateTask': 'Aufgabe aktualisieren',
    'board.updating': 'Aktualisiere...',
    'board.viewDetails': 'Details anzeigen',
    'board.writeReplyPlaceholder': 'Antwort schreiben...',
    'board.actionCannotBeUndone': 'Diese Aktion kann nicht rückgängig gemacht werden.',
    'board.taskCount': '{{count}} Aufgabe',
    'board.taskCount_plural': '{{count}} Aufgaben',
    'board.percentComplete': '{{percent}}% abgeschlossen',
    'board.mode': 'Modus',
    'board.filterTasks': 'Aufgaben filtern',
    'board.sortTasks': 'Aufgaben sortieren',
    'board.noTasksFound': 'Keine Aufgaben gefunden',
    'board.noTasks': 'Keine {{status}}-Aufgaben',
    'board.createFirstTask': 'Erstellen Sie Ihre erste Aufgabe, um zu beginnen',
    'board.executionDate': 'Ausführungsdatum',
    'board.parentTask': 'Übergeordnete Aufgabe',
    'board.subtask': 'Unteraufgabe',
    'board.creatingSubtask': 'Unteraufgabe wird erstellt für:',
    'board.team': 'Team',
    'board.members': 'Mitglieder',

    // project
    'project.title': 'Projekttitel',
    'project.description': 'Beschreibung',
    'project.status': 'Status',
    'project.priority': 'Priorität',
    'project.assignee': 'Zuständiger',
    'project.dueDate': 'Fälligkeitsdatum',
    'project.created': 'Erstellt',
    'project.updated': 'Aktualisiert',
    'project.completed': 'Abgeschlossen',
    'project.inProgress': 'In Bearbeitung',
    'project.pending': 'Ausstehend',
    'project.archived': 'Archiviert',
    'project.projectDetails': 'Projektdetails',
    'project.projectName': 'Projektname',
    'project.projectKey': 'Projektschlüssel',
    'project.timeline': 'Zeitachse',
    'project.startDate': 'Startdatum',
    'project.endDate': 'Enddatum',
    'project.close': 'Schließen',
    'project.editProject': 'Projekt bearbeiten',
    'project.notSet': 'Nicht festgelegt',
    'project.untitledProject': 'Unbenanntes Projekt',
    'project.additionalInformation': 'Zusätzliche Informationen',
    'project.noKey': 'Kein Schlüssel',
    'project.membersCount': '{{count}} Mitglied',
    'project.membersCount_plural': '{{count}} Mitglieder',

    // tasks
    'tasks.status.todo': 'Zu erledigen',
    'tasks.status.inprogress': 'In Bearbeitung',
    'tasks.status.review': 'Überprüfung',
    'tasks.status.done': 'Erledigt',
    'tasks.status.backlog': 'Backlog',
    'tasks.status.testing': 'Tests',
    'tasks.priority.low': 'Niedrig',
    'tasks.priority.medium': 'Mittel',
    'tasks.priority.high': 'Hoch',
    'tasks.priority.urgent': 'Dringend',
    'tasks.addCommentsHint': 'Zum Hinzufügen von Kommentaren klicken',
    'tasks.aria.addImage': 'Bild hinzufügen',
    'tasks.assignedTo': 'Zugewiesen an {{name}}',
    'tasks.comment': 'Kommentar',
    'tasks.comments': 'Kommentare',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Erstellt von {{name}}',
    'tasks.imageAlt': 'Aufgabenbild',
    'tasks.imageTitle': 'Aufgabe #{{id}}: {{title}}',
    'tasks.overdue': 'Aufgabe ist überfällig',
    'tasks.schedule.completed': 'Aufgabe abgeschlossen',
    'tasks.schedule.elapsedPercent': '{{percent}}% der geplanten Zeit verstrichen',
    'tasks.schedule.fullyConsumed': '(Zeit vollständig aufgebraucht)',
    'tasks.schedule.noData': 'Keine Zeitplandaten',
    'tasks.schedule.overdueSuffix': '(überfällig)',
    'tasks.tooltips.taskId': 'Aufgaben-ID: {{id}}',
    'tasks.tooltips.viewDetails': 'Klicken Sie, um Aufgabendetails und Kommentare anzuzeigen',
    'tasks.untitled': '(Unbenannt)',
    'tasks.noTasksYet': 'Noch keine Aufgaben',

    // buttons/forms/validation/tooltips largely consistent; rely on existing if already correct
    // common/email & settings corrections
    'common.email': 'E‑Mail',
    'common.emailAddress': 'E‑Mail‑Adresse',
    'common.settings': 'Einstellungen',
    // navigation
    'navigation.documentation': 'Dokumentation',
    // buttons
    'buttons.export': 'Exportieren',
    'buttons.paste': 'Einfügen',
    // forms
    'forms.required': 'Erforderlich',
    'forms.chooseFile': 'Datei auswählen',
    // admin (fix missing first letter)
    'admin.dashboard': 'Dashboard',
    'admin.emailsSent': 'E‑Mails gesendet',

    // language names (localized in German)
    'language.select': 'Sprache auswählen',
    'language.english': 'Englisch',
    'language.spanish': 'Spanisch',
    'language.german': 'Deutsch',
    'language.finnish': 'Finnisch',
    'language.swedish': 'Schwedisch',
    'language.dutch': 'Niederländisch',
    'language.french': 'Französisch',

    // theme quick fixes
    'theme.dark': 'Dunkler Modus',
    'theme.toggle': 'Design wechseln',
    'billing.invitationExpired': 'Einladung abgelaufen',

    // Landing features (curated)
    'landing.features.collaborate.title': 'Zusammenarbeiten',
    'landing.features.collaborate.description': 'Arbeiten Sie in Echtzeit an Projekten zusammen, teilen Sie Dateien und kommunizieren Sie mit Ihrem Team an einem Ort.',
    'landing.features.customize.title': 'Mit einem Klick anpassen',
    'landing.features.customize.description': 'Die Konfiguration von TaskPilot für unterschiedliche Arbeitsarten ist so einfach wie das Umlegen eines Schalters.',
    'landing.features.integrate.title': 'Spielt gut mit anderen',
    'landing.features.integrate.description': 'Verbinden Sie TaskPilot mit Ihren Lieblingstools und optimieren Sie Ihren Workflow.',
    'landing.features.search.title': 'Alles durchsuchen',
    'landing.features.search.description': 'Finden Sie jede Datei in TaskPilot, einer verbundenen App oder auf Ihrem lokalen Laufwerk – alles an einem Ort.',
    'landing.features.aiProductivity.title': 'KI‑gestützte Produktivität',
    'landing.features.aiProductivity.description': 'Erledigen Sie Arbeit schneller mit dem einzigen KI‑Assistenten, der auf Ihre Rolle zugeschnitten ist.',
    'landing.features.streamline.title': 'Workflows optimieren',
    'landing.features.streamline.description': 'Eliminieren Sie sich wiederholende Aufgaben und konzentrieren Sie sich auf das Wesentliche.',
    'landing.features.stayAhead.title': 'Bleiben Sie voraus',
    'landing.features.stayAhead.description': 'Organisieren Sie Ihre Arbeit, Erinnerungen und Kalendereinträge auf Ihrer personalisierten Startseite.'
  },
  // Additional German tokens
  de_additional: {
    'tasks.status.backlog': 'Rückstand',
    'board.status.backlog': 'Rückstand',
    'common.dashboard': 'Übersicht',
    'admin.dashboard': 'Übersicht'
  },
  // Language labels in each UI locale
  de_langs: {
    'language.portuguese': 'Portugiesisch',
    'language.italian': 'Italienisch',
    'language.hungarian': 'Ungarisch',
    'language.romanian': 'Rumänisch',
    'language.polish': 'Polnisch',
    'language.russian': 'Russisch',
    'language.danish': 'Dänisch',
    'language.norwegian': 'Norwegisch',
    'language.estonian': 'Estnisch',
    'language.latvian': 'Lettisch'
  },
  es_langs: {
    'language.portuguese': 'Portugués',
    'language.italian': 'Italiano',
    'language.hungarian': 'Húngaro',
    'language.romanian': 'Rumano',
    'language.polish': 'Polaco',
    'language.russian': 'Ruso',
    'language.danish': 'Danés',
    'language.norwegian': 'Noruego',
    'language.estonian': 'Estonio',
    'language.latvian': 'Letón'
  },
  fr_langs: {
    'language.portuguese': 'Portugais',
    'language.italian': 'Italien',
    'language.hungarian': 'Hongrois',
    'language.romanian': 'Roumain',
    'language.polish': 'Polonais',
    'language.russian': 'Russe',
    'language.danish': 'Danois',
    'language.norwegian': 'Norvégien',
    'language.estonian': 'Estonien',
    'language.latvian': 'Letton'
  },
  nl_langs: {
    'language.portuguese': 'Portugees',
    'language.italian': 'Italiaans',
    'language.hungarian': 'Hongaars',
    'language.romanian': 'Roemeens',
    'language.polish': 'Pools',
    'language.russian': 'Russisch',
    'language.danish': 'Deens',
    'language.norwegian': 'Noors',
    'language.estonian': 'Ests',
    'language.latvian': 'Lets'
  },
  sv_langs: {
    'language.portuguese': 'Portugisiska',
    'language.italian': 'Italienska',
    'language.hungarian': 'Ungerska',
    'language.romanian': 'Rumänska',
    'language.polish': 'Polska',
    'language.russian': 'Ryska',
    'language.danish': 'Danska',
    'language.norwegian': 'Norska',
    'language.estonian': 'Estniska',
    'language.latvian': 'Lettiska'
  },
  fi_langs: {
    'language.portuguese': 'Portugali',
    'language.italian': 'Italia',
    'language.hungarian': 'Unkari',
    'language.romanian': 'Romania',
    'language.polish': 'Puola',
    'language.russian': 'Venäjä',
    'language.danish': 'Tanska',
    'language.norwegian': 'Norja',
    'language.estonian': 'Viro',
    'language.latvian': 'Latvia'
  },
  es: {
    'common.back': 'Atrás',
    'common.countMeter': 'Contador',
    'common.decrease': 'Disminuir',
    'common.finish': 'Finalizar',
    'common.goToHomepage': 'Ir a la página de inicio',
    'common.increase': 'Aumentar',
    'common.next': 'Siguiente',
    'common.notNow': 'Ahora no',
    'common.previous': 'Anterior',
    'common.priority': 'Prioridad',
    'common.project': 'Proyecto',
    'common.saved': 'Guardado',
    'common.skip': 'Saltar',
    'common.title': 'Título',
    'common.unassigned': 'Sin asignar',
    'common.text': 'Texto',

    'auth.confirm': 'Confirmar',
    'auth.confirmPasswordDesc': 'Esta es un área segura de la aplicación. Por favor, confirma tu contraseña antes de continuar.',
    'auth.confirmPasswordTitle': 'Confirmar contraseña',
    'auth.confirming': 'Confirmando...',
    'auth.emailPasswordReset': 'Restablecer contraseña por correo',
    'auth.logIn': 'Iniciar sesión',
    'auth.logout': 'Cerrar sesión',
    'auth.resetPasswordDesc': '¿Olvidaste tu contraseña? No hay problema. Indícanos tu correo electrónico y te enviaremos un enlace para restablecerla.',
    'auth.resetPasswordTitle': 'Restablecer contraseña',
    'auth.resettingPassword': 'Restableciendo contraseña...',
    'auth.sending': 'Enviando...',
    'auth.signUpNow': 'Regístrate ahora',

    'landing.continueWithGoogle': 'Continuar con Google',
    'landing.signInDescription': 'Inicia sesión en tu cuenta para continuar',

    'chat.projectAssistant': 'Asistente de proyecto',
    'chat.assistantDescription': 'Pregunta por resúmenes o acciones. La primera respuesta aparece como vista previa.',
    'chat.chattingAbout': 'Conversando sobre:',
    'chat.subscribeTitle': 'Suscríbete para continuar',
    'chat.subscribeMessage': 'Para continuar y ver información de IA, necesitas suscribirte.',
    'chat.subscribeToSeeAnswer': 'Para ver esta respuesta de IA y seguir chateando, suscríbete a un plan de pago.',
    'chat.upgradeNow': 'Actualizar ahora',
    'chat.askAboutProject': 'Pregunta sobre este proyecto...',
    'chat.typeMessage': 'Escribe tu mensaje...',
    'chat.networkError': 'Error de red. Verifica tu conexión e inténtalo de nuevo.',
    'chat.failedResponse': 'No se pudo obtener respuesta del asistente',
    'chat.typing': 'El asistente está redactando una respuesta',
    'chat.welcomeMessage': '¡Hola! Soy tu asistente de proyecto. Pregúntame lo que quieras sobre "{{projectName}}".',
    'chat.suggestionsTitle': 'Preguntas sugeridas',
    'chat.errorOccurred': 'Ocurrió un error. Inténtalo de nuevo.',

    'board.taskBoard': 'Tablero de tareas',
    'board.methodology': 'Metodología',
    'board.status.todo': 'Por hacer',
    'board.status.inprogress': 'En progreso',
    'board.status.review': 'Revisión',
    'board.status.done': 'Hecho',
    'board.status.backlog': 'Backlog',
    'board.status.testing': 'Pruebas',
    'board.columns.ideas': 'Ideas',
    'board.columns.build': 'Construir',
    'board.columns.measure': 'Medir',
    'board.columns.learn': 'Aprender',
    'board.columns.validated': 'Validado',
    'board.priority.low': 'Baja',
    'board.priority.medium': 'Media',
    'board.priority.high': 'Alta',
    'board.priority.urgent': 'Urgente',
    'board.addTask': 'Añadir tarea',
    'board.editTask': 'Editar tarea',
    'board.deleteTask': 'Eliminar tarea',
    'board.duplicateTask': 'Duplicar tarea',
    'board.moveTask': 'Mover tarea',
    'board.taskDetails': 'Detalles de la tarea',
    'board.assignTask': 'Asignar tarea',
    'board.unassignTask': 'Quitar asignación',
    'board.setDueDate': 'Establecer fecha de vencimiento',
    'board.removeDueDate': 'Eliminar fecha de vencimiento',
    'board.createSubtask': 'Crear subtarea',
    'board.convertToSubtask': 'Convertir en subtarea',
    'board.attachFile': 'Adjuntar archivo',
    'board.addComment': 'Agregar comentario',
    'board.addCommentPlaceholder': 'Agregar un comentario...',
    'board.addMoreContext': 'Agregar más contexto',
    'board.addOptionalContext': 'Agregar contexto opcional, criterios de aceptación, etc.',
    'board.allMembers': 'Todos los miembros',
    'board.allPriorities': 'Todas las prioridades',
    'board.clearFilters': 'Limpiar filtros',
    'board.conciseTaskName': 'Nombre de tarea conciso',
    'board.confirmDeleteTask': '¿Seguro que deseas eliminar esta tarea?',
    'board.createSubTask': 'Crear subtarea',
    'board.createTask': 'Crear tarea',
    'board.creating': 'Creando...',
    'board.details': 'Detalles',
    'board.dueDate': 'Fecha límite',
    'board.duplicateOf': 'Duplicado de',
    'board.markAsMilestone': 'Marcar como hito del proyecto',
    'board.milestone': 'Hito',
    'board.optional': 'Opcional',
    'board.priorityFilter': 'Filtro de prioridad',
    'board.priorityLabel': 'Prioridad',
    'board.regularTask': 'Tarea normal',
    'board.searchTasks': 'Buscar tareas...',
    'board.selectDuplicate': 'Seleccionar tarea original',
    'board.selectAssignee': 'Seleccionar asignado',
    'board.selectParent': 'Seleccionar tarea padre',
    'board.startDate': 'Fecha de inicio',
    'board.taskDescription': 'Descripción de la tarea',
    'board.taskPriorityLevel': 'Nivel de prioridad',
    'board.taskTitle': 'Título de la tarea',
    'board.teamMember': 'Miembro del equipo',
    'board.timeline': 'Cronograma',
    'board.unassigned': 'Sin asignar',
    'board.updateTask': 'Actualizar tarea',
    'board.updating': 'Actualizando...',
    'board.viewDetails': 'Ver detalles',
    'board.writeReplyPlaceholder': 'Escribe una respuesta...',
    'board.actionCannotBeUndone': 'Esta acción no se puede deshacer.',
    'board.taskCount': '{{count}} tarea',
    'board.taskCount_plural': '{{count}} tareas',
    'board.percentComplete': '{{percent}}% completado',
    'board.mode': 'Modo',
    'board.filterTasks': 'Filtrar tareas',
    'board.sortTasks': 'Ordenar tareas',
    'board.noTasksFound': 'No se encontraron tareas',
    'board.noTasks': 'No hay tareas {{status}}',
    'board.createFirstTask': 'Crea tu primera tarea para comenzar',
    'board.executionDate': 'Fecha de ejecución',
    'board.parentTask': 'Tarea padre',
    'board.subtask': 'Subtarea',
    'board.creatingSubtask': 'Creando subtarea para:',
    'board.team': 'Equipo',
    'board.members': 'Miembros',

    // tasks (ES)
    'tasks.addCommentsHint': 'Haz clic para agregar comentarios',
    'tasks.aria.addImage': 'Añadir imagen',
    'tasks.assignedTo': 'Asignado a {{name}}',
    'tasks.comment': 'Comentario',
    'tasks.comments': 'Comentarios',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Creado por {{name}}',
    'tasks.imageAlt': 'Imagen de la tarea',
    'tasks.imageTitle': 'Tarea #{{id}}: {{title}}',
    'tasks.overdue': 'La tarea está vencida',
    'tasks.schedule.completed': 'Tarea completada',
    'tasks.schedule.elapsedPercent': '{{percent}}% del tiempo programado transcurrido',
    'tasks.schedule.fullyConsumed': '(Tiempo completamente consumido)',
    'tasks.schedule.noData': 'Sin datos de programación',
    'tasks.schedule.overdueSuffix': '(vencida)',
    'tasks.tooltips.taskId': 'ID de tarea: {{id}}',
    'tasks.tooltips.viewDetails': 'Haz clic para ver detalles y comentarios',
    'tasks.untitled': '(Sin título)',
    'tasks.noTasksYet': 'Aún no hay tareas'
  },
  // Additional Spanish fixes
  es_additional: {
    // chat missing letters
    'chat.subscribeTitle': 'Suscríbete para continuar',
    'chat.typeMessage': 'Escribe tu mensaje...',
    'chat.networkError': 'Error de red. Verifica tu conexión e inténtalo de nuevo.',
    'chat.typing': 'El asistente está redactando una respuesta',
    // buttons/forms common
    'buttons.export': 'Exportar',
    'buttons.paste': 'Pegar',
    'forms.required': 'Obligatorio',
    'forms.chooseFile': 'Elegir archivo',
    // landing features
    'landing.features.search.description': 'Encuentra cualquier archivo en TaskPilot, una aplicación conectada o tu unidad local, desde un solo lugar.',
    'landing.features.streamline.description': 'Elimina tareas repetitivas y enfócate en lo que más importa.',

    // language names (localized in Spanish)
    'language.select': 'Seleccionar idioma',
    'language.english': 'Inglés',
    'language.spanish': 'Español',
    'language.german': 'Alemán',
    'language.finnish': 'Finés',
    'language.swedish': 'Sueco',
    'language.dutch': 'Neerlandés',
    'language.french': 'Francés',

    // timeline chips
    'timeline.backToBoard': 'Volver al tablero',
    'timeline.defaultTitle': 'Título predeterminado',
    'timeline.scrollToToday': 'Ir a hoy',
    'timeline.status.inProgress': 'En progreso',
    'timeline.status.todo': 'Por hacer',
    'timeline.zoomIn': 'Acercar',
    'timeline.zoomOut': 'Alejar',

    // board/task statuses
    'tasks.status.done': 'Hecho',
    'tasks.status.inprogress': 'En progreso',
    'tasks.status.review': 'Revisión',
    'tasks.status.todo': 'Por hacer',
    'tasks.status.backlog': 'Backlog',
    'tasks.status.testing': 'Pruebas',
    'board.status.done': 'Hecho',
    'board.status.inprogress': 'En progreso',
    'board.status.review': 'Revisión',
    'board.status.todo': 'Por hacer',
    'board.status.backlog': 'Backlog',
    'board.status.testing': 'Pruebas',

    // dashboard chips
    'dashboard.owner': 'PROPIETARIO',
    'dashboard.collaborator': 'COLABORADOR',
    'billing.invitationExpired': 'Invitación caducada'
  },
  // More Spanish simulator fixes
  es_more: {
    'simulator.startFailed': 'Error al iniciar',
    'simulator.subtitle': 'Subtítulo',
    'simulator.explainScopeChangePlaceholder': 'Explica el motivo del cambio de alcance...',
    'simulator.explainBudgetNeedPlaceholder': 'Explica por qué se necesita presupuesto adicional...',
    'simulator.runStandupAria': 'iniciar reunión diaria',
    'simulator.addTaskFromDirectiveAria': 'agregar tarea desde directiva',
    'simulator.mediateConflictAria': 'mediar conflicto',
    'simulator.teamEventAria': 'evento de equipo',
    'simulator.resolveAllEventsAria': 'resolver todos los eventos',
    'simulator.debugResolutionAria': 'depurar resolución',
    'simulator.advanceWeekAria': 'avanzar semana',
    'simulator.dismissEventAria': 'descartar evento',
    'simulator.praiseMemberAria': 'felicitar miembro',
    'simulator.removeMemberAria': 'eliminar miembro',
    'simulator.toggleStatusAria': 'alternar estado'
  },
  fr: {
    'common.back': 'Retour',
    'common.countMeter': 'Compteur',
    'common.decrease': 'Diminuer',
    'common.finish': 'Terminer',
    'common.goToHomepage': 'Aller à la page d’accueil',
    'common.increase': 'Augmenter',
    'common.next': 'Suivant',
    'common.notNow': 'Pas maintenant',
    'common.previous': 'Précédent',
    'common.priority': 'Priorité',
    'common.project': 'Projet',
    'common.saved': 'Enregistré',
    'common.skip': 'Ignorer',
    'common.title': 'Titre',
    'common.unassigned': 'Non attribué',
    'common.text': 'Texte',

    'auth.confirm': 'Confirmer',
    'auth.confirmPasswordDesc': 'Espace sécurisé de l’application. Veuillez confirmer votre mot de passe avant de continuer.',
    'auth.confirmPasswordTitle': 'Confirmer le mot de passe',
    'auth.confirming': 'Confirmation...',
    'auth.emailPasswordReset': 'Réinitialisation par e‑mail',
    'auth.logIn': 'Se connecter',
    'auth.logout': 'Se déconnecter',
    'auth.resetPasswordDesc': 'Mot de passe oublié ? Indiquez votre e‑mail et nous vous enverrons un lien pour le réinitialiser.',
    'auth.resetPasswordTitle': 'Réinitialiser le mot de passe',
    'auth.resettingPassword': 'Réinitialisation du mot de passe...',
    'auth.sending': 'Envoi...',
    'auth.signUpNow': 'Créer un compte maintenant',

    'landing.continueWithGoogle': 'Continuer avec Google',
    'landing.signInDescription': 'Connectez‑vous pour continuer',

    'chat.projectAssistant': 'Assistant de projet',
    'chat.assistantDescription': 'Demandez des résumés ou des actions. Première réponse en aperçu.',
    'chat.chattingAbout': 'Discussion à propos de :',
    'chat.subscribeTitle': 'Abonnez‑vous pour continuer',
    'chat.subscribeMessage': 'Pour continuer et voir les informations IA, vous devez vous abonner.',
    'chat.subscribeToSeeAnswer': 'Pour voir cette réponse IA et continuer, abonnez‑vous à une offre payante.',
    'chat.upgradeNow': 'Mettre à niveau',
    'chat.askAboutProject': 'Demandez à propos de ce projet...',
    'chat.typeMessage': 'Saisissez votre message...',
    'chat.networkError': 'Erreur réseau. Vérifiez votre connexion et réessayez.',
    'chat.failedResponse': "Échec de la réponse de l’assistant",
    'chat.typing': 'L’assistant rédige une réponse',
    'chat.welcomeMessage': 'Bonjour ! Je suis votre assistant de projet. Posez‑moi vos questions sur « {{projectName}} ».',
    'chat.suggestionsTitle': 'Questions suggérées',
    'chat.errorOccurred': 'Une erreur est survenue. Réessayez.',

    'board.taskBoard': 'Tableau des tâches',
    'board.methodology': 'Méthodologie',
    'board.status.todo': 'À faire',
    'board.status.inprogress': 'En cours',
    'board.status.review': 'Relecture',
    'board.status.done': 'Terminé',
    'board.status.backlog': 'Backlog',
    'board.status.testing': 'Tests',
    'board.columns.ideas': 'Idées',
    'board.columns.build': 'Construire',
    'board.columns.measure': 'Mesurer',
    'board.columns.learn': 'Apprendre',
    'board.columns.validated': 'Validé',
    'board.priority.low': 'Faible',
    'board.priority.medium': 'Moyenne',
    'board.priority.high': 'Élevée',
    'board.priority.urgent': 'Urgente',
    'board.addTask': 'Ajouter une tâche',
    'board.editTask': 'Modifier la tâche',
    'board.deleteTask': 'Supprimer la tâche',
    'board.duplicateTask': 'Dupliquer la tâche',
    'board.moveTask': 'Déplacer la tâche',
    'board.taskDetails': 'Détails de la tâche',
    'board.assignTask': 'Assigner la tâche',
    'board.unassignTask': 'Retirer l’assignation',
    'board.setDueDate': 'Définir la date d’échéance',
    'board.removeDueDate': 'Supprimer la date d’échéance',
    'board.createSubtask': 'Créer une sous‑tâche',
    'board.convertToSubtask': 'Convertir en sous‑tâche',
    'board.attachFile': 'Joindre un fichier',
    'board.addComment': 'Ajouter un commentaire',
    'board.addCommentPlaceholder': 'Ajouter un commentaire...',
    'board.addMoreContext': 'Ajouter plus de contexte',
    'board.addOptionalContext': 'Ajouter un contexte optionnel, critères d’acceptation, etc.',
    'board.allMembers': 'Tous les membres',
    'board.allPriorities': 'Toutes les priorités',
    'board.clearFilters': 'Effacer les filtres',
    'board.conciseTaskName': 'Nom de tâche concis',
    'board.confirmDeleteTask': 'Voulez‑vous vraiment supprimer cette tâche ?',
    'board.createSubTask': 'Créer une sous‑tâche',
    'board.createTask': 'Créer une tâche',
    'board.creating': 'Création...',
    'board.details': 'Détails',
    'board.dueDate': 'Date d’échéance',
    'board.duplicateOf': 'Duplicata de',
    'board.markAsMilestone': 'Marquer comme jalon du projet',
    'board.milestone': 'Jalon',
    'board.optional': 'Optionnel',
    'board.priorityFilter': 'Filtre de priorité',
    'board.priorityLabel': 'Priorité',
    'board.regularTask': 'Tâche normale',
    'board.searchTasks': 'Rechercher des tâches...',
    'board.selectDuplicate': 'Sélectionner la tâche originale',
    'board.selectAssignee': 'Sélectionner l’assigné',
    'board.selectParent': 'Sélectionner la tâche parente',
    'board.startDate': 'Date de début',
    'board.taskDescription': 'Description de la tâche',
    'board.taskPriorityLevel': 'Niveau de priorité',
    'board.taskTitle': 'Titre de la tâche',
    'board.teamMember': 'Membre de l’équipe',
    'board.timeline': 'Chronologie',
    'board.unassigned': 'Non attribuée',
    'board.updateTask': 'Mettre à jour la tâche',
    'board.updating': 'Mise à jour...',
    'board.viewDetails': 'Voir les détails',
    'board.writeReplyPlaceholder': 'Écrire une réponse...',
    'board.actionCannotBeUndone': 'Cette action est irréversible.',
    'board.taskCount': '{{count}} tâche',
    'board.taskCount_plural': '{{count}} tâches',
    'board.percentComplete': '{{percent}}% terminé',
    'board.mode': 'Mode',
    'board.filterTasks': 'Filtrer les tâches',
    'board.sortTasks': 'Trier les tâches',
    'board.noTasksFound': 'Aucune tâche trouvée',
    'board.noTasks': 'Aucune tâche {{status}}',
    'board.createFirstTask': 'Créez votre première tâche pour commencer',
    'board.executionDate': 'Date d’exécution',
    'board.parentTask': 'Tâche parente',
    'board.subtask': 'Sous‑tâche',
    'board.creatingSubtask': 'Création d’une sous‑tâche pour :',
    'board.team': 'Équipe',
    'board.members': 'Membres',

    'tasks.addCommentsHint': 'Cliquez pour ajouter des commentaires',
    'tasks.aria.addImage': 'Ajouter une image',
    'tasks.assignedTo': 'Attribuée à {{name}}',
    'tasks.comment': 'Commentaire',
    'tasks.comments': 'Commentaires',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Créée par {{name}}',
    'tasks.imageAlt': 'Image de la tâche',
    'tasks.imageTitle': 'Tâche #{{id}} : {{title}}',
    'tasks.overdue': 'Tâche en retard',
    'tasks.schedule.completed': 'Tâche terminée',
    'tasks.schedule.elapsedPercent': '{{percent}}% du temps prévu écoulé',
    'tasks.schedule.fullyConsumed': '(Temps entièrement consommé)',
    'tasks.schedule.noData': 'Aucune donnée de planification',
    'tasks.schedule.overdueSuffix': '(en retard)',
    'tasks.tooltips.taskId': 'ID de tâche : {{id}}',
    'tasks.tooltips.viewDetails': 'Cliquez pour afficher les détails et commentaires',
    'tasks.untitled': '(Sans titre)',
    'tasks.noTasksYet': 'Pas encore de tâches'
  },
  // Additional French fixes (common missing letters & language names)
  fr_additional: {
    'common.close': 'Fermer',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'cookies.decline': 'Refuser',
    'cookies.close': 'Fermer',
    'accessibility.closeDialog': 'Fermer la boîte de dialogue',
    'accessibility.collapseMenu': 'Réduire le menu',
    'auth.resetPassword': 'Réinitialiser le mot de passe',
    'auth.joinTaskPilot': 'Rejoindre TaskPilot',
    'project.close': 'Fermer',
    'task.low': 'Faible',
    'features.reports': 'Rapports',
    'paywall.premiumFeature': 'Fonctionnalité Premium',
    'paywall.advancedReports': 'Rapports avancés',
    'dashboard.searchProjects': 'Rechercher des projets...',
    'language.finnish': 'Finnois',
    'language.french': 'Français',
    // tooltips corrections
    'tooltips.search': 'Rechercher',
    'tooltips.filter': 'Filtrer',
    'tooltips.restore': 'Restaurer',
    'tooltips.minimize': 'Réduire',
    'tooltips.close': 'Fermer',
    // features label
    'features.premiumFeature': 'Fonctionnalité Premium',
    // head.auth reset title
    'head.auth.resetPassword': 'Réinitialiser le mot de passe',
    // assistant chat
    'assistantChat.close': "Fermer la discussion de l’assistant",
    'billing.invitationExpired': 'Invitation expirée',
    'tasks.status.backlog': 'Arriéré',
    'board.status.backlog': 'Arriéré',
    'common.board': 'Tableau',
    'common.dashboard': 'Tableau de bord',
    'admin.dashboard': 'Tableau de bord'
  },
  nl: {
    'common.back': 'Terug',
    'common.countMeter': 'Teller',
    'common.decrease': 'Verlagen',
    'common.finish': 'Voltooien',
    'common.goToHomepage': 'Ga naar startpagina',
    'common.increase': 'Verhogen',
    'common.next': 'Volgende',
    'common.notNow': 'Niet nu',
    'common.previous': 'Vorige',
    'common.priority': 'Prioriteit',
    'common.project': 'Project',
    'common.saved': 'Opgeslagen',
    'common.skip': 'Overslaan',
    'common.title': 'Titel',
    'common.unassigned': 'Niet toegewezen',
    'common.text': 'Tekst',

    'landing.continueWithGoogle': 'Doorgaan met Google',
    'landing.signInDescription': 'Log in om verder te gaan',

    'board.taskBoard': 'Takenbord',
    'board.methodology': 'Methodologie',
    'board.status.todo': 'Te doen',
    'board.status.inprogress': 'Bezig',
    'board.status.review': 'Beoordeling',
    'board.status.done': 'Klaar',
    'board.status.backlog': 'Backlog',
    'board.status.testing': 'Testen',
    'board.columns.ideas': 'Ideeën',
    'board.columns.build': 'Bouwen',
    'board.columns.measure': 'Meten',
    'board.columns.learn': 'Leren',
    'board.columns.validated': 'Gevalideerd',
    'board.priority.low': 'Laag',
    'board.priority.medium': 'Middel',
    'board.priority.high': 'Hoog',
    'board.priority.urgent': 'Dringend',
    'board.addTask': 'Taak toevoegen',
    'board.editTask': 'Taak bewerken',
    'board.deleteTask': 'Taak verwijderen',
    'board.duplicateTask': 'Taak dupliceren',
    'board.moveTask': 'Taak verplaatsen',
    'board.taskDetails': 'Taakdetails',
    'board.assignTask': 'Taak toewijzen',
    'board.unassignTask': 'Toewijzing verwijderen',
    'board.setDueDate': 'Vervaldatum instellen',
    'board.removeDueDate': 'Vervaldatum verwijderen',
    'board.createSubtask': 'Subtaak maken',
    'board.convertToSubtask': 'Omzetten naar subtaak',
    'board.attachFile': 'Bestand bijvoegen',
    'board.addComment': 'Opmerking toevoegen',
    'board.addCommentPlaceholder': 'Voeg een opmerking toe...',
    'board.addMoreContext': 'Meer context toevoegen',
    'board.addOptionalContext': 'Optionele context, acceptatiecriteria, enz. toevoegen',
    'board.allMembers': 'Alle leden',
    'board.allPriorities': 'Alle prioriteiten',
    'board.clearFilters': 'Filters wissen',
    'board.conciseTaskName': 'Korte taaknaam',
    'board.confirmDeleteTask': 'Weet je zeker dat je deze taak wilt verwijderen?',
    'board.createSubTask': 'Subtaak maken',
    'board.createTask': 'Taak maken',
    'board.creating': 'Bezig...',
    'board.details': 'Details',
    'board.dueDate': 'Vervaldatum',
    'board.duplicateOf': 'Duplicaat van',
    'board.markAsMilestone': 'Markeren als projectmijlpaal',
    'board.milestone': 'Mijlpaal',
    'board.optional': 'Optioneel',
    'board.priorityFilter': 'Prioriteitsfilter',
    'board.priorityLabel': 'Prioriteit',
    'board.regularTask': 'Gewone taak',
    'board.searchTasks': 'Taken zoeken...',
    'board.selectDuplicate': 'Oorspronkelijke taak selecteren',
    'board.selectAssignee': 'Geadresseerde selecteren',
    'board.selectParent': 'Bovengeplaatste taak selecteren',
    'board.startDate': 'Startdatum',
    'board.taskDescription': 'Taakbeschrijving',
    'board.taskPriorityLevel': 'Prioriteitsniveau',
    'board.taskTitle': 'Taaktitel',
    'board.teamMember': 'Teamlid',
    'board.timeline': 'Tijdlijn',
    'board.unassigned': 'Niet toegewezen',
    'board.updateTask': 'Taak bijwerken',
    'board.updating': 'Bijwerken...',
    'board.viewDetails': 'Details bekijken',
    'board.writeReplyPlaceholder': 'Schrijf een antwoord...',
    'board.actionCannotBeUndone': 'Deze actie kan niet ongedaan worden gemaakt.',
    'board.taskCount': '{{count}} taak',
    'board.taskCount_plural': '{{count}} taken',
    'board.percentComplete': '{{percent}}% voltooid',
    'board.mode': 'Modus',
    'board.filterTasks': 'Taken filteren',
    'board.sortTasks': 'Taken sorteren',
    'board.noTasksFound': 'Geen taken gevonden',
    'board.noTasks': 'Geen {{status}} taken',
    'board.createFirstTask': 'Maak je eerste taak om te beginnen',
    'board.executionDate': 'Uitvoerdatum',
    'board.parentTask': 'Bovengeplaatste taak',
    'board.subtask': 'Subtaak',
    'board.creatingSubtask': 'Subtaak wordt gemaakt voor:',
    'board.team': 'Team',
    'board.members': 'Leden',

    'landing.continueWithGoogle': 'Doorgaan met Google',
    'landing.signInDescription': 'Log in om verder te gaan',

    'tasks.addCommentsHint': 'Klik om opmerkingen toe te voegen',
    'tasks.aria.addImage': 'Afbeelding toevoegen',
    'tasks.assignedTo': 'Toegewezen aan {{name}}',
    'tasks.comment': 'Opmerking',
    'tasks.comments': 'Opmerkingen',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Gemaakt door {{name}}',
    'tasks.imageAlt': 'Taakafbeelding',
    'tasks.imageTitle': 'Taak #{{id}}: {{title}}',
    'tasks.overdue': 'Taak is achterstallig',
    'tasks.schedule.completed': 'Taak voltooid',
    'tasks.schedule.elapsedPercent': '{{percent}}% van geplande tijd verstreken',
    'tasks.schedule.fullyConsumed': '(Tijd volledig verbruikt)',
    'tasks.schedule.noData': 'Geen plangegevens',
    'tasks.schedule.overdueSuffix': '(achterstallig)',
    'tasks.tooltips.taskId': 'Taak-ID: {{id}}',
    'tasks.tooltips.viewDetails': 'Klik voor taakdetails en opmerkingen',
    'tasks.untitled': '(Zonder titel)',
    'tasks.noTasksYet': 'Nog geen taken'
  },
  // Additional Dutch fixes
  nl_additional: {
    'language.select': 'Taal selecteren',
    'language.english': 'Engels',
    'language.spanish': 'Spaans',
    'language.german': 'Duits',
    'language.finnish': 'Fins',
    'language.swedish': 'Zweeds',
    'language.dutch': 'Nederlands',
    'language.french': 'Frans',
    // common/loading
    'common.loading': 'Laden...',
    // auth/profile new password
    'auth.newPassword': 'Nieuw wachtwoord',
    'profile.newPassword': 'Nieuw wachtwoord',
    // project labels fixes
    'project.projectKey': 'Projectsleutel',
    'project.timeline': 'Tijdlijn',
    'project.notSet': 'Niet ingesteld',
    'project.untitledProject': 'Naamloos project',
    'project.additionalInformation': 'Aanvullende informatie',
    // projects creation title
    'projects.createNewProjectTitle': 'Nieuw project aanmaken',
    // theme
    'theme.light': 'Lichte modus',
    // accessibility
    'accessibility.toggleNavigation': 'Navigatiemenu wisselen',
    'accessibility.loading': 'Laden',
    // task priority low
    'task.low': 'Laag',
    // features desc
    'features.teamCollaborationDesc': 'Nodig teamleden uit en werk samen aan projecten',
    // supports typos
    'projects.supports': 'Ondersteunt: TXT, PDF, DOC, DOCX, RTF, MD, CSV, XLS, XLSX • Max 8MB',
    'projects.allowedTypesError': 'Toegestane types: TXT, PDF, DOC, DOCX, RTF, MD, CSV, XLS, XLSX (max 8MB).',
    'billing.invitationExpired': 'Uitnodiging verlopen',
    'tasks.status.backlog': 'Achterstand',
    'board.status.backlog': 'Achterstand',
    'common.dashboard': 'Overzicht',
    'admin.dashboard': 'Overzicht'
  },
  sv: {
    'common.back': 'Tillbaka',
    'common.countMeter': 'Räknare',
    'common.decrease': 'Minska',
    'common.finish': 'Slutför',
    'common.goToHomepage': 'Gå till startsidan',
    'common.increase': 'Öka',
    'common.next': 'Nästa',
    'common.notNow': 'Inte nu',
    'common.previous': 'Föregående',
    'common.priority': 'Prioritet',
    'common.project': 'Projekt',
    'common.saved': 'Sparad',
    'common.skip': 'Hoppa över',
    'common.title': 'Titel',
    'common.unassigned': 'Inte tilldelad',
    'common.text': 'Text',

    'landing.continueWithGoogle': 'Fortsätt med Google',
    'landing.signInDescription': 'Logga in för att fortsätta',

    'board.taskBoard': 'Uppgiftstavla',
    'board.methodology': 'Metodik',
    'board.status.todo': 'Att göra',
    'board.status.inprogress': 'Pågår',
    'board.status.review': 'Granskning',
    'board.status.done': 'Klart',
    'board.status.backlog': 'Backlogg',
    'board.status.testing': 'Testning',
    'board.columns.ideas': 'Idéer',
    'board.columns.build': 'Bygga',
    'board.columns.measure': 'Mäta',
    'board.columns.learn': 'Lära',
    'board.columns.validated': 'Validerad',
    'board.priority.low': 'Låg',
    'board.priority.medium': 'Medel',
    'board.priority.high': 'Hög',
    'board.priority.urgent': 'Brådskande',
    'board.addTask': 'Lägg till uppgift',
    'board.editTask': 'Redigera uppgift',
    'board.deleteTask': 'Ta bort uppgift',
    'board.duplicateTask': 'Duplicera uppgift',
    'board.moveTask': 'Flytta uppgift',
    'board.taskDetails': 'Uppgiftsdetaljer',
    'board.assignTask': 'Tilldela uppgift',
    'board.unassignTask': 'Ta bort tilldelning',
    'board.setDueDate': 'Sätt förfallodatum',
    'board.removeDueDate': 'Ta bort förfallodatum',
    'board.createSubtask': 'Skapa deluppgift',
    'board.convertToSubtask': 'Konvertera till deluppgift',
    'board.attachFile': 'Bifoga fil',
    'board.addComment': 'Lägg till kommentar',
    'board.addCommentPlaceholder': 'Lägg till en kommentar...',
    'board.addMoreContext': 'Lägg till mer kontext',
    'board.addOptionalContext': 'Lägg till valfri kontext, acceptanskriterier, etc.',
    'board.allMembers': 'Alla medlemmar',
    'board.allPriorities': 'Alla prioriteringar',
    'board.clearFilters': 'Rensa filter',
    'board.conciseTaskName': 'Kort uppgiftsnamn',
    'board.confirmDeleteTask': 'Är du säker på att du vill radera denna uppgift?',
    'board.createSubTask': 'Skapa deluppgift',
    'board.createTask': 'Skapa uppgift',
    'board.creating': 'Skapar...',
    'board.details': 'Detaljer',
    'board.dueDate': 'Förfallodatum',
    'board.duplicateOf': 'Dubblett av',
    'board.markAsMilestone': 'Markera som projektmilstolpe',
    'board.milestone': 'Milstolpe',
    'board.optional': 'Valfritt',
    'board.priorityFilter': 'Prioritetsfilter',
    'board.priorityLabel': 'Prioritet',
    'board.regularTask': 'Vanlig uppgift',
    'board.searchTasks': 'Sök uppgifter...',
    'board.selectDuplicate': 'Välj originaluppgift',
    'board.selectAssignee': 'Välj tilldelad',
    'board.selectParent': 'Välj överordnad uppgift',
    'board.startDate': 'Startdatum',
    'board.taskDescription': 'Uppgiftsbeskrivning',
    'board.taskPriorityLevel': 'Prioritetsnivå',
    'board.taskTitle': 'Uppgiftstitel',
    'board.teamMember': 'Teammedlem',
    'board.timeline': 'Tidslinje',
    'board.unassigned': 'Inte tilldelad',
    'board.updateTask': 'Uppdatera uppgift',
    'board.updating': 'Uppdaterar...',
    'board.viewDetails': 'Visa detaljer',
    'board.writeReplyPlaceholder': 'Skriv ett svar...',
    'board.actionCannotBeUndone': 'Denna åtgärd kan inte ångras.',
    'board.taskCount': '{{count}} uppgift',
    'board.taskCount_plural': '{{count}} uppgifter',
    'board.percentComplete': '{{percent}}% slutfört',
    'board.mode': 'Läge',
    'board.filterTasks': 'Filtrera uppgifter',
    'board.sortTasks': 'Sortera uppgifter',
    'board.noTasksFound': 'Inga uppgifter hittades',
    'board.noTasks': 'Inga {{status}} uppgifter',
    'board.createFirstTask': 'Skapa din första uppgift för att börja',
    'board.executionDate': 'Utförandedatum',
    'board.parentTask': 'Överordnad uppgift',
    'board.subtask': 'Deluppgift',
    'board.creatingSubtask': 'Skapar deluppgift för:',
    'board.team': 'Team',
    'board.members': 'Medlemmar',

    'tasks.addCommentsHint': 'Klicka för att lägga till kommentarer',
    'tasks.aria.addImage': 'Lägg till bild',
    'tasks.assignedTo': 'Tilldelad till {{name}}',
    'tasks.comment': 'Kommentar',
    'tasks.comments': 'Kommentarer',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Skapad av {{name}}',
    'tasks.imageAlt': 'Uppgiftsbild',
    'tasks.imageTitle': 'Uppgift #{{id}}: {{title}}',
    'tasks.overdue': 'Uppgiften är försenad',
    'tasks.schedule.completed': 'Uppgiften slutförd',
    'tasks.schedule.elapsedPercent': '{{percent}}% av planerad tid förfluten',
    'tasks.schedule.fullyConsumed': '(Tid helt förbrukad)',
    'tasks.schedule.noData': 'Inga schemauppgifter',
    'tasks.schedule.overdueSuffix': '(försenad)',
    'tasks.tooltips.taskId': 'Uppgifts-ID: {{id}}',
    'tasks.tooltips.viewDetails': 'Klicka för att visa detaljer och kommentarer',
    'tasks.untitled': '(Utan titel)',
    'tasks.noTasksYet': 'Inga uppgifter ännu'
  },
  
  // Additional Swedish fixes
  sv_additional: {
    'chat.typeMessage': 'Skriv ett meddelande...',
    'chat.errorOccurred': 'Ett fel inträffade. Försök igen.',
    'buttons.export': 'Exportera',
    'buttons.paste': 'Klistra in',
    'forms.required': 'Obligatoriskt',
    'forms.chooseFile': 'Välj fil',
    'common.email': 'E‑post',
    'common.emailAddress': 'E‑postadress',
    'navigation.documentation': 'Dokumentation',
    'landing.features.collaborate.description': 'Samarbeta i realtid i projekt, dela filer och kommunicera med ditt team på ett ställe.',
    'landing.features.streamline.description': 'Eliminera repetitiva uppgifter och fokusera på det som är viktigast.',
    // language names
    'language.select': 'Välj språk',
    'language.english': 'Engelska',
    'language.spanish': 'Spanska',
    'language.german': 'Tyska',
    'language.finnish': 'Finska',
    'language.swedish': 'Svenska',
    'language.dutch': 'Nederländska',
    'language.french': 'Franska',
    'billing.invitationExpired': 'Inbjudan har gått ut',
    'common.dashboard': 'Översikt',
    'admin.dashboard': 'Översikt',
    'auth.confirming': 'Bekräftar...',
    'common.dashboard': 'Översikt',
    'admin.dashboard': 'Översikt',
    // tasks statuses
    'tasks.status.todo': 'Att göra',
    'tasks.status.inprogress': 'Pågår',
    'tasks.status.review': 'Granskning',
    'tasks.status.done': 'Klart',
    'tasks.status.backlog': 'Backlogg',
    'tasks.status.testing': 'Testning',
    // billing translations
    'billing.cancelSubscription': 'Avsluta prenumeration',
    'billing.cancelSubscriptionAction': 'Avsluta prenumeration',
    'billing.currentPlan': 'Aktuellt paket',
    'billing.keepSubscription': 'Behåll prenumeration',
    'billing.mostPopular': 'Mest populär',
    'billing.onTrial': 'Testperiod',
    'billing.whyCancel': 'Varför vill du avsluta?',
    'billing.yesContinue': 'Ja, fortsätt',
    'billing.activeSubscriber': 'Aktiv prenumerant',
    'billing.cancelConfirmation': 'Vill du verkligen avsluta din {{planName}}-prenumeration? Du förlorar premiumfunktioner vid nuvarande faktureringsperiods slut.',
    'billing.cancellationReasons.missing_features': 'Saknar de funktioner jag behöver',
    'billing.cancellationReasons.not_using_enough': 'Använder inte tillräckligt',
    'billing.cancellationReasons.other': 'Annat skäl',
    'billing.cancellationReasons.switching_service': 'Byter till annan tjänst',
    'billing.cancellationReasons.technical_issues': 'Tekniska problem',
    'billing.cancellationReasons.temporary_pause': 'Tillfälligt uppehåll',
    'billing.cancellationReasons.too_expensive': 'För dyrt',
    'billing.cancelsOn': 'Avslutas den {{date}}',
    'billing.dayTrial': '{{days}} dagars testperiod',
    'billing.freeTier': 'Gratisnivå',
    'billing.helpImprove': 'Hjälp oss förbättra genom att berätta varför du avslutar:',
    'billing.priceLoading': 'Pris läses in...',
    'billing.resumeSubscription': 'Återuppta prenumeration',
    'billing.startDayTrial': 'Starta {{days}} dagars testperiod',
    'billing.startPlan': 'Starta {{plan}}',
    'billing.stripeNotice': 'Betalningar hanteras säkert av Stripe. Starta din gratis provperiod med ett giltigt kreditkort.',
    'billing.subtitle': 'Välj ett paket och starta en gratis provperiod. Få tillgång till premiumfunktioner som AI-uppgiftsgenerering, teamsamarbete och avancerade rapporter.',
    'billing.title': 'Fakturering och prenumeration',
    'billing.trialEndsOn': 'Provperioden slutar {{date}}',
    'billing.upgradeToPlan': 'Uppgradera till {{plan}}-paketet'
  },
  fi: {
    'common.back': 'Takaisin',
    'common.countMeter': 'Laskuri',
    'common.decrease': 'Vähennä',
    'common.finish': 'Valmis',
    'common.goToHomepage': 'Siirry etusivulle',
    'common.increase': 'Lisää',
    'common.next': 'Seuraava',
    'common.notNow': 'Ei nyt',
    'common.previous': 'Edellinen',
    'common.priority': 'Prioriteetti',
    'common.project': 'Projekti',
    'common.saved': 'Tallennettu',
    'common.skip': 'Ohita',
    'common.title': 'Otsikko',
    'common.unassigned': 'Ei määritetty',
    'common.text': 'Teksti',

    'landing.continueWithGoogle': 'Jatka Googlella',
    'landing.signInDescription': 'Kirjaudu sisään jatkaaksesi',

    'board.taskBoard': 'Tehtävätaulu',
    'board.methodology': 'Menetelmä',
    'board.status.todo': 'Tehtävä',
    'board.status.inprogress': 'Käynnissä',
    'board.status.review': 'Tarkistus',
    'board.status.done': 'Valmis',
    'board.status.backlog': 'Taustalista',
    'board.status.testing': 'Testaus',
    'board.columns.ideas': 'Ideat',
    'board.columns.build': 'Rakentaa',
    'board.columns.measure': 'Mittaa',
    'board.columns.learn': 'Oppia',
    'board.columns.validated': 'Vahvistettu',
    'board.priority.low': 'Matala',
    'board.priority.medium': 'Keskitaso',
    'board.priority.high': 'Korkea',
    'board.priority.urgent': 'Kiireellinen',
    'board.addTask': 'Lisää tehtävä',
    'board.editTask': 'Muokkaa tehtävää',
    'board.deleteTask': 'Poista tehtävä',
    'board.duplicateTask': 'Monista tehtävä',
    'board.moveTask': 'Siirrä tehtävä',
    'board.taskDetails': 'Tehtävän tiedot',
    'board.assignTask': 'Määritä tehtävä',
    'board.unassignTask': 'Poista määritys',
    'board.setDueDate': 'Aseta eräpäivä',
    'board.removeDueDate': 'Poista eräpäivä',
    'board.createSubtask': 'Luo alitehtävä',
    'board.convertToSubtask': 'Muunna alitehtäväksi',
    'board.attachFile': 'Liitä tiedosto',
    'board.addComment': 'Lisää kommentti',
    'board.addCommentPlaceholder': 'Lisää kommentti...',
    'board.addMoreContext': 'Lisää taustatietoa',
    'board.addOptionalContext': 'Lisää valinnainen konteksti, hyväksymiskriteerit jne.',
    'board.allMembers': 'Kaikki jäsenet',
    'board.allPriorities': 'Kaikki prioriteetit',
    'board.clearFilters': 'Tyhjennä suodattimet',
    'board.conciseTaskName': 'Ytimekäs tehtävän nimi',
    'board.confirmDeleteTask': 'Haluatko varmasti poistaa tämän tehtävän?',
    'board.createSubTask': 'Luo alitehtävä',
    'board.createTask': 'Luo tehtävä',
    'board.creating': 'Luodaan...',
    'board.details': 'Tiedot',
    'board.dueDate': 'Eräpäivä',
    'board.duplicateOf': 'Kopio kohteesta',
    'board.markAsMilestone': 'Merkitse projektin virstanpylvääksi',
    'board.milestone': 'Virstanpylväs',
    'board.optional': 'Valinnainen',
    'board.priorityFilter': 'Prioriteettisuodatin',
    'board.priorityLabel': 'Prioriteetti',
    'board.regularTask': 'Tavallinen tehtävä',
    'board.searchTasks': 'Hae tehtäviä...',
    'board.selectDuplicate': 'Valitse alkuperäinen tehtävä',
    'board.selectAssignee': 'Valitse vastuuhenkilö',
    'board.selectParent': 'Valitse ylätason tehtävä',
    'board.startDate': 'Aloituspäivä',
    'board.taskDescription': 'Tehtävän kuvaus',
    'board.taskPriorityLevel': 'Prioriteettitaso',
    'board.taskTitle': 'Tehtävän otsikko',
    'board.teamMember': 'Tiimin jäsen',
    'board.timeline': 'Aikajana',
    'board.unassigned': 'Ei määritetty',
    'board.updateTask': 'Päivitä tehtävä',
    'board.updating': 'Päivitetään...',
    'board.viewDetails': 'Näytä tiedot',
    'board.writeReplyPlaceholder': 'Kirjoita vastaus...',
    'board.actionCannotBeUndone': 'Toimintoa ei voi perua.',
    'board.taskCount': '{{count}} tehtävä',
    'board.taskCount_plural': '{{count}} tehtävää',
    'board.percentComplete': '{{percent}}% valmis',
    'board.mode': 'Tila',
    'board.filterTasks': 'Suodata tehtäviä',
    'board.sortTasks': 'Lajittele tehtäviä',
    'board.noTasksFound': 'Tehtäviä ei löytynyt',
    'board.noTasks': 'Ei {{status}} tehtäviä',
    'board.createFirstTask': 'Luo ensimmäinen tehtävä aloittaaksesi',
    'board.executionDate': 'Suorituspäivä',
    'board.parentTask': 'Ylätason tehtävä',
    'board.subtask': 'Alitehtävä',
    'board.creatingSubtask': 'Luodaan alitehtävää:',
    'board.team': 'Tiimi',
    'board.members': 'Jäsenet',

    'tasks.addCommentsHint': 'Napsauta lisätäksesi kommentteja',
    'tasks.aria.addImage': 'Lisää kuva',
    'tasks.assignedTo': 'Vastuuhenkilö: {{name}}',
    'tasks.comment': 'Kommentti',
    'tasks.comments': 'Kommentit',
    'tasks.commentsCount': '{{count}} {{label}}',
    'tasks.createdBy': 'Luonut {{name}}',
    'tasks.imageAlt': 'Tehtäväkuva',
    'tasks.imageTitle': 'Tehtävä #{{id}}: {{title}}',
    'tasks.overdue': 'Tehtävä on myöhässä',
    'tasks.schedule.completed': 'Tehtävä valmis',
    'tasks.schedule.elapsedPercent': '{{percent}}% suunnitellusta ajasta kulunut',
    'tasks.schedule.fullyConsumed': '(Aika käytetty)',
    'tasks.schedule.noData': 'Ei aikataulutietoja',
    'tasks.schedule.overdueSuffix': '(myöhässä)',
    'tasks.tooltips.taskId': 'Tehtävän ID: {{id}}',
    'tasks.tooltips.viewDetails': 'Näytä tehtävän tiedot ja kommentit',
    'tasks.untitled': '(Nimetön)',
    'tasks.noTasksYet': 'Ei vielä tehtäviä'
  }
  ,
  // Additional Finnish fixes
  fi_additional: {
    'language.select': 'Valitse kieli',
    'language.english': 'Englanti',
    'language.spanish': 'Espanja',
    'language.german': 'Saksa',
    'language.finnish': 'Suomi',
    'language.swedish': 'Ruotsi',
    'language.dutch': 'Hollanti',
    'language.french': 'Ranska',
    'billing.invitationExpired': 'Kutsu on vanhentunut',
    'tasks.status.backlog': 'Taustalista',
    'board.status.backlog': 'Taustalista',
    'common.dashboard': 'Yleiskatsaus',
    'admin.dashboard': 'Yleiskatsaus'
  }
};

function applyOverrides(localeObj, locale) {
  const ovr = Object.assign(
    {},
    overrides[locale] || {},
    overrides[`${locale}_additional`] || {},
    overrides[`${locale}_more`] || {},
    overrides[`${locale}_langs`] || {},
    overrides[`${locale}_lang`] || {},
    overrides[`${locale}_language`] || {},
    overrides[`${locale}_languages`] || {}
  );
  for (const [k, v] of Object.entries(ovr)) {
    set(localeObj, k, v);
  }
}

function fixMissingFirstLetter(str) {
  // Fix a few common artifacts where first letter was chopped for English strings.
  const fixes = [
    [/^(escription)(\b|\s)/i, 'Description$2'],
    [/^(itle)(\b|\s)/i, 'Title$2'],
    [/^(ownload)(\b|\s)/i, 'Download$2'],
    [/^(vents)(\b|\s)/i, 'Events$2'],
    [/^(eams)(\b|\s)/i, 'Teams$2'],
    [/^(ritical)(\b|\s)/i, 'Critical$2'],
    [/^(echnical)(\b|\s)/i, 'Technical$2'],
    [/^(iew)(\b|\s)/i, 'View$2'],
    [/^(etails)(\b|\s)/i, 'Details$2']
  ];
  for (const [re, rep] of fixes) {
    if (re.test(str)) return str.replace(re, rep);
  }
  return str;
}

function traverseAndFix(obj, fixer) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) traverseAndFix(v, fixer);
    else if (typeof v === 'string') obj[k] = fixer(v);
  }
}

function main() {
  for (const locale of locales) {
    const data = loadLocale(locale);

    // Apply targeted overrides first
    applyOverrides(data, locale);

    // For English, fix common chopped-leading-letter artifacts globally
    if (locale === 'en') {
      traverseAndFix(data, fixMissingFirstLetter);
    }

    // Locale-specific start-of-string quick fixes for common chopped initials
    if (locale === 'de') {
      traverseAndFix(data, (s) => {
        return s
          .replace(/^[\-‑]?Mail/,'E‑Mail')
          .replace(/^[\-‑]?Mail[\-‑]Adresse/,'E‑Mail‑Adresse')
          .replace(/^instellungen(\b|\s)/,'Einstellungen$1')
          .replace(/^rstellen(\b|\s)/,'Erstellen$1')
          .replace(/^rfolg(\b|\s)/,'Erfolg$1')
          .replace(/^okumentation(\b|\s)/,'Dokumentation$1')
          .replace(/^nddatum(\b|\s)/,'Enddatum$1')
          .replace(/^ashboard(\b|\s)/,'Dashboard$1')
          .replace(/^xportieren(\b|\s)/,'Exportieren$1')
          .replace(/^infügen(\b|\s)/,'Einfügen$1')
          .replace(/^etails(\b|\s)/,'Details$1')
          .replace(/^eschreibung(\b|\s)/,'Beschreibung$1')
          .replace(/^atei(\b|\s)/,'Datei$1');
      });
    }
    if (locale === 'es') {
      traverseAndFix(data, (s) => {
        return s
          .replace(/^uscríbete(\b|\s)/,'Suscríbete$1')
          .replace(/^scribe(\b|\s)/,'Escribe$1')
          .replace(/^rror(\b|\s)/,'Error$1')
          .replace(/^l asistente(\b|\s)/,'El asistente$1')
          .replace(/^ncuentra(\b|\s)/,'Encuentra$1')
          .replace(/^limina(\b|\s)/,'Elimina$1');
      });
    }
    if (locale === 'sv') {
      traverseAndFix(data, (s) => {
        return s
          .replace(/^kriv(\b|\s)/,'Skriv$1')
          .replace(/^tt\s/,'Ett ');
      });
    }
    if (locale === 'fr') {
      traverseAndFix(data, (s) => {
        let r = s
          .replace(/^ermer(\b|\s)/,'Fermer$1')
          .replace(/^echercher(\b|\s)/,'Rechercher$1')
          .replace(/^iltrer(\b|\s)/,'Filtrer$1')
          .replace(/^éduire(\b|\s)/,'Réduire$1')
          .replace(/^efuser(\b|\s)/,'Refuser$1')
          .replace(/^estaurer(\b|\s)/,'Restaurer$1')
          .replace(/^apports(\b|\s)/,'Rapports$1')
          .replace(/^onctionnalité(\b|\s)/,'Fonctionnalité$1')
          .replace(/^rançais(\b|\s)/,'Français$1')
          .replace(/^innois(\b|\s)/,'Finnois$1')
          .replace(/^lux\sde\stravail/,'Flux de travail')
          .replace(/^ationaliser(\b|\s)/,'Rationaliser$1')
          .replace(/^ationalisez(\b|\s)/,'Rationalisez$1');
        r = r.replace(/([\s\(\[\{\.!?])ationalisez/,'$1Rationalisez');
        r = r.replace(/([\s\(\[\{\.!?])ationaliser/,'$1Rationaliser');
        return r;
      });
    }

    // Normalize simple conjunctions and backlog terms
    if (locale !== 'en') {
      const orMap = {de:'ODER', es:'O', fr:'OU', nl:'OF', sv:'ELLER', fi:'TAI'};
      if (orMap[locale]) set(data, 'common.or', orMap[locale]);
      if (locale==='es'){
        set(data,'tasks.status.backlog','Pendientes');
        set(data,'board.status.backlog','Pendientes');
      }
    }

    // Save back
    saveLocale(locale, data);
    console.log(`Updated ${locale}.json`);
  }
}

// Allow running via node directly
main();
