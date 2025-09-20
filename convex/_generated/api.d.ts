/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin_course from "../admin/course.js";
import type * as admin_exercises from "../admin/exercises.js";
import type * as admin_identitiesJwt from "../admin/identitiesJwt.js";
import type * as admin_image from "../admin/image.js";
import type * as admin_imageGeneration from "../admin/imageGeneration.js";
import type * as admin_lectureWeeks from "../admin/lectureWeeks.js";
import type * as admin_lectures from "../admin/lectures.js";
import type * as admin_reports from "../admin/reports.js";
import type * as admin_users from "../admin/users.js";
import type * as admin_weeks from "../admin/weeks.js";
import type * as attempts from "../attempts.js";
import type * as auth_adapters_ConvexActionAdapter from "../auth/adapters/ConvexActionAdapter.js";
import type * as auth_adapters_ConvexMutationAdapter from "../auth/adapters/ConvexMutationAdapter.js";
import type * as auth_cron from "../auth/cron.js";
import type * as auth_google from "../auth/google.js";
import type * as auth_lucia from "../auth/lucia.js";
import type * as auth_tequila from "../auth/tequila.js";
import type * as auth_withAuth from "../auth/withAuth.js";
import type * as chat from "../chat.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as exercises from "../exercises.js";
import type * as internal_seed from "../internal/seed.js";
import type * as lectures from "../lectures.js";
import type * as quiz from "../quiz.js";
import type * as superadmin_courses from "../superadmin/courses.js";
import type * as superadmin_relocation from "../superadmin/relocation.js";
import type * as superadmin_util from "../superadmin/util.js";
import type * as superassistant_attempt from "../superassistant/attempt.js";
import type * as superassistant_messages from "../superassistant/messages.js";
import type * as superassistant_problem from "../superassistant/problem.js";
import type * as video_chat from "../video/chat.js";
import type * as video_geminiUtils from "../video/geminiUtils.js";
import type * as weeks from "../weeks.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "admin/course": typeof admin_course;
  "admin/exercises": typeof admin_exercises;
  "admin/identitiesJwt": typeof admin_identitiesJwt;
  "admin/image": typeof admin_image;
  "admin/imageGeneration": typeof admin_imageGeneration;
  "admin/lectureWeeks": typeof admin_lectureWeeks;
  "admin/lectures": typeof admin_lectures;
  "admin/reports": typeof admin_reports;
  "admin/users": typeof admin_users;
  "admin/weeks": typeof admin_weeks;
  attempts: typeof attempts;
  "auth/adapters/ConvexActionAdapter": typeof auth_adapters_ConvexActionAdapter;
  "auth/adapters/ConvexMutationAdapter": typeof auth_adapters_ConvexMutationAdapter;
  "auth/cron": typeof auth_cron;
  "auth/google": typeof auth_google;
  "auth/lucia": typeof auth_lucia;
  "auth/tequila": typeof auth_tequila;
  "auth/withAuth": typeof auth_withAuth;
  chat: typeof chat;
  courses: typeof courses;
  crons: typeof crons;
  exercises: typeof exercises;
  "internal/seed": typeof internal_seed;
  lectures: typeof lectures;
  quiz: typeof quiz;
  "superadmin/courses": typeof superadmin_courses;
  "superadmin/relocation": typeof superadmin_relocation;
  "superadmin/util": typeof superadmin_util;
  "superassistant/attempt": typeof superassistant_attempt;
  "superassistant/messages": typeof superassistant_messages;
  "superassistant/problem": typeof superassistant_problem;
  "video/chat": typeof video_chat;
  "video/geminiUtils": typeof video_geminiUtils;
  weeks: typeof weeks;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
