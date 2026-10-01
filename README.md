# intro
- experiment with multi-agent setup for Biz Strat course at CMU
- basic workings:
  - one orchestrator skill with full task overview and ownership
  - 3 agents that are called by that skill
    - worker: runs sonnet, performs initial research 
    - challenger: runs haiku on medium effort, will be adversarial and will try to prove worker wrong
    - conciliator: runs sonent on medium effort, will take the best points from each view
    - worker-chad: runs opus on high effort, used for crucial areas of research only
  - nothing happens in a chat, all work is done on files (.md), allowing full traceability and strict viewership by agents
  - each agent operates on the files left by previous agents so as gto avoid large prompts
  - agents are constrained on which files they are shown
    - challenger only sees what worker produced on that run, nothing more (to avoid it giving up critizing based on previous facts)
    - worker and conciliator sees everything up to that point to ensure full context
  - challenger specifics
    - challender is limited to run 3 times per stage to avoid extremely long conversations
    - challenger is run by default on letter e, for the other two letters it is sampled
      - at the begining of a stage, a script samples two draws from a distribution with weights we chose to reflect the importance of each step
     
