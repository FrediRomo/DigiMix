import asyncio
import websockets
import json

# A set to hold all connected clients
connected_clients = set()

async def handle_connection(websocket, path):
    # Add the client to the set of connected clients
    connected_clients.add(websocket)
    try:
        print("Client connected")

        # Handle incoming messages from the client
        async for message in websocket:
            print(f"Received message: {message}")

            # Parse the message to check if it's valid filter data
            try:
                filter_data = json.loads(message)

                # Broadcast the filter data to all other clients
                await broadcast_to_others(message, websocket)
                
            except json.JSONDecodeError:
                print("Received invalid JSON data")

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")

    finally:
        # Remove the client from the set of connected clients on disconnect
        connected_clients.remove(websocket)

# Function to broadcast a message to all clients except the one who sent it
async def broadcast_to_others(message, sender_socket):
    if connected_clients:  # Check if there are connected clients
        other_clients = [client for client in connected_clients if client != sender_socket]
        if other_clients:
            await asyncio.wait([client.send(message) for client in other_clients])

async def main():
    # Start server on localhost and port 8765
    async with websockets.serve(handle_connection, "localhost", 8765):
        print("WebSocket server is running on ws://localhost:8765")
        await asyncio.Future()  # Run the server forever

if __name__ == "__main__":
    asyncio.run(main())
