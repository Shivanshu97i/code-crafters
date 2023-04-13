import { ChallengeType, Difficulty } from "@prisma/client";
import type { GetServerSidePropsContext, NextPage } from "next";
import Head from "next/head";
import { useForm, type SubmitHandler } from "react-hook-form";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import {
  type FileWithPath,
  useDropzone,
  type DropzoneRootProps,
  type DropzoneInputProps,
} from "react-dropzone";
import { type UploadApiResponse } from "cloudinary";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  codeLive,
  codePreview,
  codeEdit,
} from "@uiw/react-md-editor/lib/commands";
import { getServerAuthSession } from "~/server/auth";
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

type FormValues = {
  title: string;
  type: ChallengeType;
  difficulty: Difficulty;
};

const NewChallengePage: NextPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  const {
    acceptedFiles: acceptedImageFiles,
    getRootProps: getImageRootProps,
    getInputProps: getImageInputProps,
  } = useDropzone({
    multiple: true,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
  });
  const {
    acceptedFiles: acceptedVideoFiles,
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
  } = useDropzone({
    accept: {
      "video/mp4": [".mp4"],
      "video/mkv": [".mkv"],
    },
    multiple: false,
    maxSize: 10000000, // 10MB
  });
  const [desc, setDesc] = useState<string>("");
  const [showImageError, setShowImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const createChallenge = api.challenge.create.useMutation({
    onSuccess: () => {
      setLoading(false);
      void router.push("/challenges");
    },
    onError: () => {
      setLoading(false);
    },
  });
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!data.title || !data.type || !data.difficulty) {
      return alert("Please fill all the fields");
    }
    if (acceptedImageFiles.length === 0) {
      setShowImageError(true);
      return;
    }
    setLoading(true);
    const urls = (await Promise.all([
      await uploadToCloudinary(acceptedImageFiles),
      await uploadToCloudinary(acceptedVideoFiles, true),
    ])) as [string[], string[]];

    createChallenge.mutate({
      difficulty: data.difficulty,
      imagesURL: urls[0],
      briefDesc: desc,
      title: data.title,
      type: data.type,
      videoURL: urls[1].length ? urls[1][0] : undefined,
    });
  };

  useEffect(() => {
    if (acceptedImageFiles.length > 0) {
      setShowImageError(false);
    }
  }, [acceptedImageFiles]);

  return (
    <>
      <Head>
        <title>Create a new Challenge</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col py-12 ">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)();
          }}
          className="mx-auto flex w-full max-w-3xl flex-col rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col space-x-2">
            <label className="label">
              <span className="label-text text-base font-medium">
                Challenge title *
              </span>
            </label>
            <input
              {...register("title", {
                required: "Challenge title is required",
              })}
              placeholder=""
              type="text"
              className={`input-bordered ${
                errors.title ? "input-error" : ""
              } input w-full`}
            />
            {errors.title?.type === "required" && (
              <label className="label">
                <span className="label-text-alt text-red-400">
                  {errors.title?.message}
                </span>
              </label>
            )}
          </div>
          <div className="flex flex-col space-x-2">
            <label className="label">
              <span className="label-text text-base font-medium">
                Challenge Type *
              </span>
            </label>
            <select {...register("type")} className="select-bordered select">
              {Object.values(ChallengeType).map((type, i) => (
                <option key={i} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-x-2">
            <label className="label">
              <span className="label-text text-base font-medium">
                Difficulty *
              </span>
            </label>
            <select
              {...register("difficulty")}
              className="select-bordered select"
            >
              {Object.values(Difficulty).map((d, i) => (
                <option key={i} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-x-2">
            <label className="label justify-start space-x-2">
              <span className=" label-text text-base font-medium">
                Challenge Images *
              </span>
              {showImageError && (
                <span className="label-text-alt text-red-400">
                  Please upload at least one image
                </span>
              )}
            </label>
            <DropZoneInput
              acceptedFiles={acceptedImageFiles}
              getInputProps={getImageInputProps}
              getRootProps={getImageRootProps}
            />
          </div>
          <div className="flex flex-col space-x-2">
            <label className="label">
              <span className="label-text text-base font-medium">
                Challenge Videos (optional)
              </span>
            </label>
            <DropZoneInput
              acceptedFiles={acceptedVideoFiles}
              getInputProps={getVideoInputProps}
              getRootProps={getVideoRootProps}
            />
          </div>
          <div data-color-mode="light" className="flex flex-col space-x-2">
            <label className="label">
              <span className="label-text text-base font-medium">
                Brief Description *
              </span>
            </label>
            <MDEditor
              value={desc}
              onChange={(val) => {
                setDesc(val || "");
              }}
              preview="edit"
              enableScroll
              extraCommands={[codeEdit, codePreview, codeLive]}
            />
          </div>
          <button
            type="submit"
            className="btn-primary btn mt-5"
            disabled={loading}
          >
            {loading && (
              <span
                className="mr-1 inline-block h-4 w-4 animate-spin rounded-full border-[3px] border-current border-t-transparent text-white "
                role="status"
                aria-label="loading"
              ></span>
            )}
            {loading ? "Loading" : "Submit"}
          </button>
        </form>
      </main>
    </>
  );
};

export default NewChallengePage;

function DropZoneInput({
  acceptedFiles,
  getRootProps,
  getInputProps,
}: {
  acceptedFiles: File[];
  getRootProps: <T extends DropzoneRootProps>(props?: T | undefined) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T | undefined) => T;
}) {
  const files = acceptedFiles.map((file: FileWithPath) => (
    <li key={file.path}>
      {file.path} - {(file.size / 1000).toFixed(1)} KB
    </li>
  ));

  return (
    <section className="container">
      <div
        {...getRootProps({
          className:
            "flex-1 h-24 justify-center flex flex-col items-center p-5 border-2 rounded-md border-dashed transition duration-150 ease-in-out border-[hsl(214.29_30.061%_31.961%)]/20 text-gray-400 focus:border-blue-400  focus:text-blue-400 cursor-pointer outline-none",
        })}
      >
        <input {...getInputProps()} />
        <p>Drag n drop some files here, or click to select files</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>{files}</ul>
      </aside>
    </section>
  );
}
const uploadToCloudinary = async (acceptedFiles: File[], isVideo?: boolean) => {
  const uploadedImages = await Promise.all(
    acceptedFiles.map(async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "fpbrzu0b");
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/dpuscktmu/${
          isVideo ? "video" : "image"
        }/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = (await res.json()) as UploadApiResponse;
      return data.secure_url;
    })
  );
  return uploadedImages;
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);

  if (!session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
