// $License: battery_library_runtime
//--------------------------------------------------------------------------------
/**
  @file $relPath
  @copyright $copyright
  @author mzoerfuss
*/

//--------------------------------------------------------------------------------
// Libraries used (#uses)

//--------------------------------------------------------------------------------
// Variables and Constants

//--------------------------------------------------------------------------------
/**
*/
class Licensing
{
//--------------------------------------------------------------------------------
//@public members
//--------------------------------------------------------------------------------

  public static bool checkBLLicense(bool engineering = true) synchronized (instancePtr)
  {
    if (equalPtr(instancePtr, nullptr))
    {
      assignPtr(instancePtr, new Licensing());
    }

    bool licensed = instancePtr.m_runtimeLicensed;

    if (engineering)
    {
      licensed = (licensed && instancePtr.m_engineeringLicensed);
    }

    if (!licensed)
    {
      throwError(
        makeError(
          "", PRIO_FATAL, ERR_SYSTEM, 0,
          "PM for Batteries Licensing", "Custom license keywords \"" +
            (engineering ? "battery_library_engineering\" and/or \"" : "") +
            "battery_library_runtime\" not available! Manager will exit!"
        )
      );
      //exit(0); // stop manager
    }

    return licensed;
  }

//--------------------------------------------------------------------------------
//@protected members
//--------------------------------------------------------------------------------

  //------------------------------------------------------------------------------
  /** The Default Constructor.
  */
  protected Licensing()
  {
    m_runtimeLicensed = (getLicenseOption("battery_library_runtime") > 0);
    m_engineeringLicensed = (getLicenseOption("battery_library_engineering") > 0);
  }

  protected bool m_engineeringLicensed = false;
  protected bool m_runtimeLicensed = false;

  protected static shared_ptr<Licensing> instancePtr = nullptr;

//--------------------------------------------------------------------------------
//@private members
//--------------------------------------------------------------------------------

};
