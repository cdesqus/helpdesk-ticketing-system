import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  Ticket, 
  Users, 
  MessageSquare, 
  BarChart3,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: Ticket,
      title: "Ticket Management",
      description: "Create, track, and manage support tickets efficiently with our intuitive interface."
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Secure access control with admin, engineer, and reporter roles for proper workflow."
    },
    {
      icon: MessageSquare,
      title: "Communication",
      description: "Internal and external comments to keep everyone informed about ticket progress."
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Comprehensive reporting and analytics to track performance and trends."
    }
  ];

  const benefits = [
    "Streamlined ticket creation and assignment",
    "Real-time status updates and notifications",
    "Secure role-based access control",
    "Comprehensive audit trail",
    "Email notifications and alerts",
    "Export capabilities for reporting"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <HelpCircle className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                IDESOLUSI Helpdesk
              </span>
            </div>
            <Link to="/login">
              <Button>
                Login
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Helpdesk
            <span className="text-blue-600 block">Management System</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your support operations with our comprehensive helpdesk solution. 
            Manage tickets, track progress, and deliver exceptional customer service.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Support Teams
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage support tickets efficiently and provide 
              excellent customer service.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose IDESOLUSI Helpdesk?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our helpdesk system is designed to improve efficiency, enhance communication, 
                and provide better support experiences for both your team and customers.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8">
              <div className="text-center">
                <HelpCircle className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join thousands of teams who trust our helpdesk system to manage 
                  their support operations.
                </p>
                <Link to="/login">
                  <Button size="lg" className="w-full">
                    Access Your Account
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8 text-blue-400" />
              <span className="ml-2 text-xl font-bold">IDESOLUSI Helpdesk</span>
            </div>
            <p className="text-gray-400 mb-4">
              Professional helpdesk management system for modern support teams.
            </p>
            <p className="text-sm text-gray-500">
              © 2024 IDESOLUSI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
