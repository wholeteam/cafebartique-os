import { Context } from "hono";
import { toastGet } from "./client";

export async function toastEmployeeExport(c: Context<{ Bindings: Env }>) {
  try {
    const [employees, jobs] = await Promise.all([
      toastGet(c.env, "/labor/v1/employees"),
      toastGet(c.env, "/labor/v1/jobs"),
    ]);

    const employeeList = Array.isArray(employees) ? employees : [];
    const jobList = Array.isArray(jobs) ? jobs : [];

    return c.json({
      service: "Cafe Bartique Toast Employee Export",
      status: "success",
      generatedAt: new Date().toISOString(),
      source: "Toast Labor API V1",
      counts: {
        employees: employeeList.length,
        activeEmployees: employeeList.filter((employee: any) => !employee?.deleted && !employee?.disabled).length,
        archivedOrDisabledEmployees: employeeList.filter((employee: any) => employee?.deleted || employee?.disabled).length,
        jobs: jobList.length,
      },
      notes: {
        passcodes: "Toast does not return existing employee passcodes on GET requests. New Clover passcodes should be generated during setup.",
      },
      data: {
        employees: employeeList,
        jobs: jobList,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        service: "Cafe Bartique Toast Employee Export",
        status: "error",
        generatedAt: new Date().toISOString(),
        message: error?.message ?? "Unable to retrieve Toast employee data.",
      },
      500
    );
  }
}
