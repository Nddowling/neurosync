// Owned route registry. Keep route names stable for existing bookmarks.
import Calendar from './pages/Calendar';
import Consult from './pages/Consult';
import DSMReference from './pages/DSMReference';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Landing from './pages/Landing';
import Medications from './pages/Medications';
import PatientDetail from './pages/PatientDetail';
import Patients from './pages/Patients';
import SOAPNotes from './pages/SOAPNotes';
import Subscription from './pages/Subscription';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
    "Consult": Consult,
    "DSMReference": DSMReference,
    "Dashboard": Dashboard,
    "KnowledgeBase": KnowledgeBase,
    "Landing": Landing,
    "Medications": Medications,
    "PatientDetail": PatientDetail,
    "Patients": Patients,
    "SOAPNotes": SOAPNotes,
    "Subscription": Subscription,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};