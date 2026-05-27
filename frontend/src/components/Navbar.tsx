import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-lg font-bold">Home Organization App</h1>
        <div>
          <a href="/" className="text-gray-300 hover:text-white px-4">
            Home
          </a>
          <a href="/inventory" className="text-gray-300 hover:text-white px-4">
            Inventory
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
