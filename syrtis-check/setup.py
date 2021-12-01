import cx_Freeze

exe = [cx_Freeze.Executable("syrtis_check.py", base="Win32GUI", icon="syrtis.ico")]

cx_Freeze.setup(
    name = "SyrtisCheck",
    version = "1.0",
    options = {
        "build_exe": { "packages": [
            "logging",
            "codecs",
            "os",
            "re",
            "time",
            "tkinter",
            "selenium"
        ],
        "include_files": [
            "credentials.txt",
            "geckodriver.exe",
            "syrtis.ico"
        ]}},
    executables = exe
)
