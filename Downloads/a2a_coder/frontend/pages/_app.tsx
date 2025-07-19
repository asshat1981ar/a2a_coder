import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>A2A System Dashboard</title>
        <meta name="description" content="Agent-to-Agent System Management Dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #f5f5f5;
          color: #333;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .card {
          background: white;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header {
          background: #2c3e50;
          color: white;
          padding: 20px 0;
          margin-bottom: 30px;
        }
        
        .header h1 {
          text-align: center;
          font-size: 2rem;
        }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        
        .button {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.2s;
        }
        
        .button:hover {
          background: #2980b9;
        }
        
        .button:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          margin-bottom: 16px;
        }
        
        .textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          min-height: 120px;
          resize: vertical;
          margin-bottom: 16px;
        }
        
        .status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status.active {
          background: #2ecc71;
          color: white;
        }
        
        .status.offline {
          background: #e74c3c;
          color: white;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
        
        .error {
          background: #e74c3c;
          color: white;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
        
        .success {
          background: #2ecc71;
          color: white;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
      `}</style>
    </>
  );
}