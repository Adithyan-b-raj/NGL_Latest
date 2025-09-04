# Anonymous Chat System

## Overview

This is a real-time anonymous chat application built with React, Express, and WebSocket technology. The system allows users to send anonymous messages through a web interface while providing administrators with a dashboard to manage and respond to conversations. The application features a clean, modern UI built with shadcn/ui components and supports real-time bidirectional communication between users and administrators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built with React and TypeScript, utilizing a component-based architecture with the following key design decisions:

- **React Router**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Real-time Communication**: Custom WebSocket hook for bidirectional messaging
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
The server-side follows a RESTful API design with WebSocket integration:

- **Express.js**: Web framework handling HTTP requests and middleware
- **WebSocket Server**: Real-time communication for chat functionality
- **Storage Layer**: Abstracted storage interface with in-memory implementation (IStorage pattern)
- **Session Management**: Cookie-based sessions for admin authentication
- **Route Organization**: Centralized route registration with error handling middleware

### Data Storage Solutions
The application uses an abstracted storage pattern that currently implements in-memory storage:

- **Schema Definition**: Drizzle ORM schemas with PostgreSQL dialect configuration
- **Type Safety**: TypeScript interfaces generated from Drizzle schemas
- **Data Models**: Conversations, Messages, and AdminUsers with proper relationships
- **Migration Support**: Drizzle Kit for database schema management

### Authentication and Authorization
Simple role-based authentication system:

- **Admin Authentication**: Username/password login with session persistence
- **User Sessions**: Anonymous session tracking for conversation continuity
- **Access Control**: Route-level protection for admin endpoints
- **Session Storage**: Cookie-based session management

### Real-time Communication
WebSocket implementation for live chat functionality:

- **Connection Management**: Persistent WebSocket connections with automatic reconnection
- **Message Broadcasting**: Real-time message delivery between users and admins
- **Session Association**: WebSocket connections linked to user/admin sessions
- **Error Handling**: Graceful handling of connection failures and message parsing errors

## External Dependencies

### Core Framework Dependencies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **Express.js**: Backend web framework for REST API and middleware
- **TypeScript**: Type safety across the entire application stack
- **Vite**: Fast development server and build tool with HMR support

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **@neondatabase/serverless**: PostgreSQL connection driver for serverless environments
- **Drizzle Kit**: Database migration and introspection tools

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography

### Real-time and Communication
- **ws**: WebSocket library for real-time bidirectional communication
- **TanStack Query**: Server state management with caching and synchronization

### Development and Build Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution environment for development
- **PostCSS**: CSS processing with Tailwind integration
- **Autoprefixer**: CSS vendor prefixing for browser compatibility

### Validation and Forms
- **Zod**: Runtime type validation and schema parsing
- **React Hook Form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Integration between React Hook Form and Zod