export default function About() {
  const tools = [
    {
      name: "Options Pricer",
      icon: "✦",
      description:
        "CME NASDAQ-100 futures options data was used to train an XGBoost regression model for price prediction, with Black-76 as a benchmark. Hyperparameters were optimised using Optuna, and performance evaluated using Mean Absolute Error.",
      // We chose XGBoost because real option prices do not always follow strict textbook formulas.
      // Models like Black-76 are useful as a benchmark, but markets are also driven by trader
      // behaviour, risk sentiment, and sudden volatility spikes. By learning from large amounts of
      // historical Nasdaq-100 options data, our model captures these real-world patterns and gives
      // prices that are closer to how the market actually trades.
      why: "We use XGBoost to learn how options are priced in real markets, not just in theory. Black-76 remains our benchmark, while the ML model captures extra market behaviour and improves practical pricing accuracy.",
      tags: ["XGBoost", "Black-76", "Optuna", "CME Data", "MAE"],
    },
    {
      name: "House Price Forecasting",
      icon: "✦",
      description:
        "HM Land Registry and Energy Performance Certificate (EPC) data, combined with ONS price data, to predict median property prices across Kent.",
      why: "Median price was chosen as target variable due to its robustness to outliers. We predicted the price at MSOA-level first and mapped it to postcode district. XGBoost was selected as the final model for its ability to capture non-linear relationship between property characteristics and price.",
      tags: ["HM Land Registry", "EPC Data", "ONS", "Regional ML"],
    },
    {
      name: "Sentiment Analysis",
      icon: "✦",
      description:
        "Financial news data is analysed using the Vader model to understand the current market state, capturing context and nuance in financial language.",
      why: "(Please enter why you chose this approach here)",
      tags: ["Vader", "NLP", "Financial News"],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">
          About <span className="text-green-400">CrossQuant</span>
        </h1>
        <p className="text-zinc-400 max-w-3xl leading-relaxed">
          A cross-asset financial intelligence platform that bridges the gap between liquid derivatives markets and illiquid housing markets.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 mb-6">
        <h2 className="block text-md font-bold text-green-400 uppercase tracking-wide mb-1">Aims</h2>
        <p className="text-zinc-200 text-md leading-relaxed">
          CrossQuant integrates machine learning-based options pricing, regional housing forecasting, and NLP-driven sentiment analysis into a unified, data-driven investment intelligence framework. Investors can log in, create a personalised profile, and monitor cross-asset portfolio performance in one place.
        </p>
      </div>

      {/* Tools */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Our Tools</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div key={tool.name} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 h-full">
              <div className="flex items-start gap-4 h-full">
                <span className="text-green-400 text-2xl mt-0.5 leading-none">{tool.icon}</span>
                <div className="flex-1 flex flex-col">
                  <h3 className="text-white font-semibold text-lg mb-2">{tool.name}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-3">{tool.description}</p>
                  {/* Why this approach */}
                  <div className="border-l-2 border-green-400/40 pl-3 mb-4">
                    <p className="text-zinc-500 text-xs italic">{tool.why}</p>
                  </div>
                  {/* Tech tags */}
                  <div className="flex flex-wrap gap-2">
                    {tool.tags.map((tag) => (
                      <span key={tag} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-0.5 rounded-md font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-zinc-600 text-sm text-center">
        Built as a 3rd year group project — combining quantitative finance, machine learning, and software engineering.
      </p>
    </div>
  );
}