import React from 'react';

export function ExampleComponent() {
  return (
    <div className="container">
      <button onClick={() => console.log('clicked')}>
        Click me
      </button>
      <input type="text" placeholder="Enter text" />
      <a href="/home" className="link">
        Go home
      </a>
      <div style={{ backgroundColor: '#63g5fh', color: '#ffffff' }}>
        Styled content
      </div>
    </div>
  );
}