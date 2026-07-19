"""LangGraph build: START -> data_agent -> [debt_agent | savings_agent | budget_agent] ->
synthesizer -> END. A deterministic graph with LLM-powered nodes — no free-form agent chatter.
"""

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agents import budget_agent, data_agent, debt_agent, savings_agent, synthesizer
from app.agents.state import GraphState


def build_graph() -> CompiledStateGraph:
    graph = StateGraph(GraphState)

    graph.add_node("data_agent", data_agent.run)
    graph.add_node("debt_agent", debt_agent.run)
    graph.add_node("savings_agent", savings_agent.run)
    graph.add_node("budget_agent", budget_agent.run)
    graph.add_node("synthesizer", synthesizer.run)

    graph.add_edge(START, "data_agent")
    graph.add_edge("data_agent", "debt_agent")
    graph.add_edge("data_agent", "savings_agent")
    graph.add_edge("data_agent", "budget_agent")
    graph.add_edge("debt_agent", "synthesizer")
    graph.add_edge("savings_agent", "synthesizer")
    graph.add_edge("budget_agent", "synthesizer")
    graph.add_edge("synthesizer", END)

    return graph.compile()
