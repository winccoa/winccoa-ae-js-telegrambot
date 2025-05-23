// $License: NOLICENSE
//--------------------------------------------------------------------------------
/**
  @file $relPath
  @copyright $copyright
  @author z004rapd
*/

//--------------------------------------------------------------------------------
// Libraries used (#uses)

//--------------------------------------------------------------------------------
// Variables and Constants

//--------------------------------------------------------------------------------
/**
*/
float baseQ = 0.9;
float baseA = 0.9;
float baseP = 0.9;
bool simulate = false;
void main()
{
  startThread("sim", "Sim.SimulateAlmQuality", baseQ);
  dpConnect("setAlmQ", "Sim.SimulateAlmQuality");
  dpConnect("setAlmP", "Sim.SimulateAlmPerf");
  dpConnect("setAlmA", "Sim.SimulateAlmAvail");
  dpConnect("setSim", "Sim.Run");
}

void sim(string dp, float& val)
{
  while(true)
  {
    delay(1);
    if(simulate)
    {
      dpSet("System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Availability.", getRandomVariation(baseA));
      dpSet("System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Performance.", getRandomVariation(baseP));
      dpSet("System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Quality.", getRandomVariation(baseQ));
    }
  }
}

setAlmQ(string dp, bool val)
{
  baseQ = val ? 0.6 : 0.9;
}

setAlmP(string dp, bool val)
{
  baseP = val ? 0.6 : 0.9;
}

setAlmA(string dp, bool val)
{
  baseA = val ? 0.6 : 0.9;
}

setSim(string dp, bool val)
{
  simulate = val;
}

float getRandomVariation(float baseValue)
{
  float variation = ((rand() % 201) - 100) / 1000.0; // Generates a random float between -0.1 and +0.1
  return baseValue * (1.0 + variation);
}
