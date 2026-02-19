
try:
    from agents.chief_agent import chief_agent
    print("Successfully imported chief_agent")
    
    import asyncio
    async def test_stream():
        print("Testing stream compatibility...")
        gen = chief_agent.stream_request("test")
        print(f"Generator created: {gen}")
        # Dont actually run it because it needs ollama running
        
    asyncio.run(test_stream())
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
