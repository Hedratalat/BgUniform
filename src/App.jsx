import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import ContactUs from "./pages/ContactUs";
import About from "./pages/AboutUs";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import DashBoardLayout from "./components/DashboardLayout/DashboardLayout";
import MessageDashboard from "./pages/MessageDashboard";
import WorkSectorDashboard from "./pages/WorkSectorsDashboard";
import FeedbackDashboard from "./pages/FeedbackDashboard";
import MaterialsDashboard from "./pages/Materialsdashboard";
import Materials from "./pages/Materials";
import ProductsManagement from "./pages/Productsmanagement";
import Products from "./pages/Products";
import Login from "./pages/Login";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrdersDashboard from "./pages/Ordersdashboard";
import Customize from "./pages/Customize";

function App() {
  return (
    <>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="materials" element={<Materials />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customize" element={<Customize />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />

          <Route
            path="/dashboard"
            element={
              // <ProtectedRoute>
              <DashBoardLayout />
              // </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="productsManagement" replace />}
            />
            <Route path="productsManagement" element={<ProductsManagement />} />
            <Route path="workSector" element={<WorkSectorDashboard />} />
            <Route path="ordersDah" element={<OrdersDashboard />} />
            <Route path="materials" element={<MaterialsDashboard />} />
            <Route path="feedback" element={<FeedbackDashboard />} />
            <Route path="message" element={<MessageDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
