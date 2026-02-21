import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router';
import { PublicLayout } from './layouts/PublicLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

import HomePage from './pages/public/HomePage';
import ShopPage from './pages/public/ShopPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import BundleDetailPage from './pages/public/BundleDetailPage';
import ServicesPage from './pages/public/ServicesPage';
import ServiceDetailPage from './pages/public/ServiceDetailPage';
import AcademyPage from './pages/public/AcademyPage';
import CourseDetailPage from './pages/public/CourseDetailPage';
import EnrollPage from './pages/public/EnrollPage';
import CheckoutPage from './pages/public/CheckoutPage';
import AccountPage from './pages/public/AccountPage';
import BookingPage from './pages/public/BookingPage';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

import StudentDashboard from './pages/student/Dashboard';
import StudentCourses from './pages/student/Courses';
import StudentCourseDetail from './pages/student/CourseDetail';
import StudentCertificates from './pages/student/Certificates';
import StudentShop from './pages/student/Shop';
import StudentOrders from './pages/student/Orders';
import StudentProfile from './pages/student/Profile';

import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminCustomers from './pages/admin/Customers';
import AdminAcademy from './pages/admin/Academy';
import AdminMarketingCMS from './pages/admin/MarketingCMS';
import AdminBookings from './pages/admin/Bookings';
import AdminPayments from './pages/admin/Payments';
import AdminReports from './pages/admin/Reports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/Settings';

// Admin Shop
import AdminProducts from './pages/admin/shop/Products';
import AdminInventory from './pages/admin/shop/Inventory';
import AdminBrands from './pages/admin/shop/Brands';
import AdminCollections from './pages/admin/shop/Collections';
import AdminBundles from './pages/admin/shop/Bundles';
import AdminPromotions from './pages/admin/shop/Promotions';

// Salon Admin
import AdminStylists from './pages/admin/salon/Stylists';
import AdminServices from './pages/admin/salon/Services';
import BookingSettingsPage from './pages/admin/salon/BookingSettings';

import AdminStudents from './pages/admin/Students';
import { ShopGuard } from './components/shared/ShopGuard';

import '../styles/fonts.css';
import '../styles/structura.css';

import { AdminGuard, StudentGuard, CustomerGuard } from './components/auth/RoleGuards';
import InviteSignupPage from './pages/auth/InviteSignupPage';
import { ExitPreview } from './components/shared/ExitPreview';

function ProductRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/shop/product/${slug}`} replace />;
}

export default function App() {
  return (
    <Router>
      <ExitPreview />
      <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        
        {/* SHOP */}
        <Route element={<ShopGuard />}>
          <Route path="shop" element={<ShopPage />} />
          <Route path="shop/product/:slug" element={<ProductDetailPage />} />
          <Route path="shop/bundle/:slug" element={<BundleDetailPage />} />
          {/* Fallback for direct product access */}
          <Route path="shop/:slug" element={<ProductRedirect />} />
        </Route>
        
        {/* SALON */}
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailPage />} />
        
        {/* ACADEMY */}
        <Route path="academy" element={<AcademyPage />} />
        <Route path="academy/course/:id" element={<CourseDetailPage />} />
        <Route path="academy/enroll" element={<EnrollPage />} />
        
        {/* AUTH */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="invite/:token" element={<InviteSignupPage />} />
        
        {/* CUSTOMER PROTECTED */}
        <Route element={<CustomerGuard />}>
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="booking" element={<BookingPage />} />
        </Route>
      </Route>

      <Route path="/student" element={<StudentGuard />}>
        <Route element={<StudentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="courses" element={<StudentCourses />} />
            <Route path="courses/:id" element={<StudentCourseDetail />} />
            <Route path="certificates" element={<StudentCertificates />} />
            <Route path="shop" element={<StudentShop />} />
            <Route path="orders" element={<StudentOrders />} />
            <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Route>

      <Route path="/admin" element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            
            {/* Shop Admin */}
            <Route path="products" element={<AdminProducts />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="collections" element={<AdminCollections />} />
            <Route path="bundles" element={<AdminBundles />} />
            <Route path="promotions" element={<AdminPromotions />} />
            
            {/* Salon Admin */}
            <Route path="salon/stylists" element={<AdminStylists />} />
            <Route path="salon/services" element={<AdminServices />} />
            <Route path="booking-settings" element={<BookingSettingsPage />} />

            <Route path="academy" element={<AdminAcademy />} />
            <Route path="marketing-cms" element={<AdminMarketingCMS />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reports" element={<Navigate to="reports/revenue" replace />} />
            <Route path="reports/:type" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
